import asyncio
from typing import AsyncGenerator, Awaitable

from fastapi.logger import logger

from app.schemas.dictionary import TermInfo
from config.config import (
    REFER_DICTIONARY_V1_GENERATE_MAX_SENSE,
    REFER_DICTIONARY_V1_GROUP_SIZE,
    ZERO_VECTOR_300,
)
import app.services.refer_dictionary as rd
import app.crud.dictionary as crud_dict
import app.crud.dictionary_v1 as crud_dict_v1
import app.services.llm as llm
from app.services.enbedding import spacy_enbedding as sp_emb
from typing import Callable

# 

# ================================ endpoint_service ======================================
async def service_analyze_text(text: str):
    async for entry in refer_dictionary(text):
        # スコア計算
        for term in entry:
            pass
        # 結果の整形
        pass

# ========================== Protocols / Type Aliases ===============================

# embedding APIを呼び出す関数の型定義
CallableEmbeddingAPIProtocol = Callable[[str], list[float]]
# DBに用語情報を挿入する関数の型定義
InsertDBTermInfosProtocol = Callable[[list[TermInfo]], None]
# DBから用語情報を読み取る関数の型定義
FetchTermInfosProtocol = Callable[[list[str]], list[TermInfo]]
# LLMに意味候補の生成を依頼する関数の型定義
GenerateTermSensesProtocol = Callable[[str], Awaitable[dict[str, list[str]]]]


# ================================= Service ======================================

async def refer_dictionary(text: str) -> AsyncGenerator[list[rd.DictionaryEntry], None]:
    """
    テキスト中の名詞を辞書検索し、結果を返す。
    処理フローメモ

        0. 文embedding
        1. 名詞抽出
        2. dedup
        3. DB一括取得
            hitはbest sense選択して返す

        4. missのみ対象
        5. 各単語ごとにLLM（ただしバッチ化はする）

        6. sense生成（max 3）
        7. embedding（事前計算）
        8. DB保存

        10. 各termでbest sense選択

    注意事項：LLMで1単語に付き複数の意味の生成は、MVPでは実装しない。将来的に必要になったら実装する。
    """
    # DBミスしたときの処理を宣言的に関数化しておく（後で並列化するため）
    async def _miss_terms_handler(terms_db_miss: list[str]) -> list[TermInfo]:
        # missした用語の意味候補をLLMで生成
        result_senses = await _generate_senses_for_terms(
            senses_generater=llm.generate_term_senses,
            terms=terms_db_miss,
            group_size=REFER_DICTIONARY_V1_GROUP_SIZE,
            generate_max_sense=REFER_DICTIONARY_V1_GENERATE_MAX_SENSE,
        )
        # ベクトル化
        results_terms = _embed_terms(call_embedding_api=sp_emb.call_embedding_api, terms=result_senses)
        return results_terms
    
    # TODO: エンベディングと形態素・DB検索の並列化の検討 (しばらくは実装に着手しない)
    # 入力テキストのembeddingを先に計算しておく（意味的な近さの計算に使うため）
    # test_embedding = asyncio.create_task(_compute_text_embedding(sp_emb.call_embedding_api, text))

    # 形態素解析で検索対象の抽出
    search_targets = rd._extract_search_targets(text)
    if not search_targets:
        yield []
        return
    
    # dedup（複数の形態素が同じ単語を指す場合があるため）
    unique_terms = list(set(search_targets))
    unique_joined_terms = ["".join(term_tuple) for term_tuple in unique_terms]

    # DB検索(バッチで検索)
    results_term = await asyncio.to_thread(
        _fetch_term_infos_or_empty,
        fetch_term_infos=crud_dict_v1.read_term_infos,
        terms=unique_joined_terms
    )

    miss_task: asyncio.Task | None = None
    # missがあれば、事前に並列実行
    if results_term.__len__() != unique_joined_terms.__len__():
        terms_db_miss = [term for term in unique_joined_terms if term not in {r.term for r in results_term}] 
        miss_task = asyncio.create_task(_miss_terms_handler(terms_db_miss))

    # hitはbest sense選択して返す (今は1単語1意味の想定なのでそのまま返す)
    yield _best_sense_selection(term_infos=results_term, text_embedding=[], source="db")
    if miss_task is None:
        # missがない場合はここで終わり
        return
    
    # missの処理（1.意味生成、2. embedding、3. DB保存）
    results_terms = await miss_task
    # TODO: DB保存をスレッドに分離して並列化し、書き込みの確認をせずにreturnすることも検討
    # DB保存
    storetask = asyncio.create_task(
        asyncio.to_thread(
            store_term_infos,
            insert_db_term_infos=crud_dict_v1.insert_term_infos,
            term_infos=results_terms
        )
    )
    
    # 最後にbest sense選択して返す
    yield _best_sense_selection(term_infos=results_terms, text_embedding=[], source="llm")
    await storetask


# =========================== Domain ===================================

def _compute_text_embedding(*, call_embedding_api: CallableEmbeddingAPIProtocol, text: str) -> list[float]:
    """
    入力テキストのembeddingを計算する関数
    外部APIを呼び出してembeddingを計算する想定
    Args:
        embedding_model: embeddingモデルのcall_embedding_api関数
        text: 入力テキスト
    Returns:
        embedding: テキストの意味を表すベクトル
    """
    try:
        embedding = call_embedding_api(text)
        return embedding
    except Exception as e:
        logger.exception("Embedding APIの呼び出しに失敗: %s\n ゼロベクトルを返します。", e)
        return ZERO_VECTOR_300.copy()

def _embed_terms(call_embedding_api: CallableEmbeddingAPIProtocol, terms: dict[str, list[str]]) -> list[TermInfo]:
    """
    用語のリストを受け取り、各用語の意味テキストをembeddingを計算する関数
    Args:
        call_embedding_api: embedding APIを呼び出す関数
        terms: 用語をキー、意味のテキストのリストを値に
    Returns:
        term_infos: 用語情報のリスト。各用語情報は、用語と、意味テキストとそのembeddingのタプルのリストを持つ
    """
    results_terms: list[TermInfo] = []
    # 用語ごとに意味のembeddingを計算する
    for term, senses in terms.items():
        term_info = TermInfo(term=term, idf_wiki=None, description_embeddings=[])
        for sense in senses:
            embedding = _compute_text_embedding(call_embedding_api=call_embedding_api, text=sense)
            # DB保存のためのオブジェクトを作る
            term_info.description_embeddings.append((sense, embedding))
        results_terms.append(term_info)
    return results_terms

def _fetch_term_infos_or_empty(fetch_term_infos: FetchTermInfosProtocol, terms: list[str]) -> list[TermInfo]:
    """
    DBから用語情報を取得し、失敗時は空リストにフォールバックする。
    Args:
        fetch_term_infos: 用語情報を取得する関数
        terms: 検索対象の用語リスト
    Returns:
        term_infos: DBから取得した用語情報。DB検索失敗時は空リスト。
    """
    try:
        return fetch_term_infos(terms)
    except Exception as e:
        logger.exception("DB検索に失敗: %s\n フォールバックとして空の結果を返します。", e)
        return []

# 旧実装のためコメント化
# _fetch_term_infos_or_emptyの引数に設定することで、旧実装も利用可能
# def _search_dictionary(terms: list[str]) -> list[TermInfo]:
#     """
#     DBから複数の用語情報を検索する関数
#     複合語を連結した文字列で検索する
#     Args:
#         terms: 検索する用語のリスト
#     Returns:
#         term_infos: 検索結果の用語情報のリスト
#     """
#     try:
#         result = crud_dict.search_sense_dictionary(terms=terms)
#     except Exception as e:
#         logger.exception("DB検索に失敗: %s\n フォールバックとして空の結果を返します。", e)
#         return []
#     return [TermInfo(term=entry.term, idf_wiki=None, description_embeddings=[(entry.description, entry.meaning_vector)]) for entry in result]


async def _generate_senses_for_terms(
    senses_generater: GenerateTermSensesProtocol,
    terms: list[str],
    group_size: int = 10,
    generate_max_sense: int = 3,
) -> dict[str, list[str]]:
    """
    辞書参照用に、用語ごとの意味候補をLLMで生成する。
    Args:
        senses_generater: 用語の意味候補を生成する関数
        terms: 意味候補を生成する用語のリスト
        group_size: 一度にLLMへ渡す用語数
        generate_max_sense: 一度に生成する意味の最大数
    Returns:
        result_senses: 用語をキー、意味候補の配列を値にした辞書
    """
    result_senses: dict[str, list[str]] = {}
    prompts = _build_prompts(
        terms,
        group_size=group_size,
        generate_max_sense=generate_max_sense,
    )
    # プロンプトごとにLLMを呼び出して意味候補を得る。複数プロンプトがある場合は並列で呼び出す。
    generate_senses_tasks = [
        asyncio.create_task(senses_generater(prompt)) for prompt in prompts
    ]
    responses = await asyncio.gather(*generate_senses_tasks)
    # 並列がすべて完了したら、結果を1つにまとめる
    for response in responses:
        result_senses.update(response)
    # 空の意味候補は除外する
    result_senses = {term: senses for term, senses in result_senses.items() if senses}
    return result_senses

def store_term_infos(*, insert_db_term_infos: InsertDBTermInfosProtocol, term_infos: list[TermInfo]) -> None:
    """
    用語情報のリストをDBに保存する関数
    エラーはログに記録するが、処理は継続する（部分的に保存できる可能性があるため）
    Args:
        insert_db_term_infos: 用語情報をDBに挿入する関数
        term_infos: 保存する用語情報のリスト
    """
    try:
        insert_db_term_infos(term_infos)
    except Exception as e:
        logger.exception("DB保存に失敗: %s\n 処理は継続します。", e)

def _best_sense_selection(term_infos: list[TermInfo], text_embedding: list[float], source: str) -> list[rd.DictionaryEntry]:
    """
        DBから複数エントリがヒットした場合の意味選択ロジック
        Args:
            term_infos: DBからヒットした用語情報のリスト
            text_embedding: 入力テキストのembedding
            source: 用語のソース（DBかLLMか）を示す文字列
        Returns:
            best_info: term_infosの中でtext_embeddingに最も意味的に近い
    """
    # TODO: text_embeddingとterm_infosの意味ベクトルを比較して最も近いものを選ぶロジックを実装する（現状は単純に先頭の意味を選ぶ）
    # また、ゼロベクトルを想定したハンドリングも必要(スコア計算も同じく)
    results: list[rd.DictionaryEntry] = []
    for term_info in term_infos:
        if not term_info.description_embeddings:
            continue
        results.append(
            rd.DictionaryEntry(
                term=term_info.term,
                description=term_info.description_embeddings[0][0],
                meaning_vector=term_info.description_embeddings[0][1],
                source=source,
            )
        )
    return results

def _build_prompts(terms: list[str], group_size: int = 10, generate_max_sense: int = 3) -> list[str]:
    """
    LLMに渡すプロンプトを生成する関数
    Args:
        terms: プロンプトを生成する用語のリスト
        group_size: 一度に処理する用語の数。LLMのトークン制限や処理時間を考慮して適切な値を設定する。
        generate_max_sense: 一度に生成する意味の数
    Returns:
        prompts: 生成されたプロンプトのリスト
    """
    # group_size個ずつtermをまとめる
    prompts = []
    for i in range(0, len(terms), group_size):
        terms_group = terms[i:i + group_size]
        terms_str = "\n".join(f"- {term}" for term in terms_group)

        prompts.append(f"""
            あなたは辞書アシスタントです。
            以下の単語それぞれについて、日本語で使われる主要な意味を1~{generate_max_sense}つ出してください。

            条件:
            - 各単語は独立して処理してください
            - 入力文脈は使わず、一般的な意味を答えてください
            - 専門用語の言い換えを優先し、簡潔に答えてください。
            - 意味は短く具体的にしてください
            - 同じような意味を重複させないでください
            - 不明な単語は空配列にしてください
            - 出力はJSONのみとし、説明文は出さないでください
            - JSONのキーは入力された単語と完全に一致させてください

            出力形式(JSON):
            {{
            "単語1": [
                "意味1",
                "意味2",
                "意味3"
            ],
            "単語2": [
                "意味1",
                "意味2",
                "意味3"
            ],
                       ...
            }}
            
            単語:
            {terms_str}
        """)
    return prompts




# ========================================================================
