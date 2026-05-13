import time
from typing import AsyncGenerator

from fastapi.logger import logger

import app.services.refer_dictionary as rd
import app.services.text_analysis as txt_ana
import app.crud.dictionary as crud_dict
import app.services.llm as llm
import app.services.enbedding as embedding_model

# ================================ endpoint_service ======================================
async def service_analyze_text(text: str):
    async for entry in refer_dictionary(text):
        # スコア計算
        for term in entry:
            pass
        # 結果の整形
        pass


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
    # TODO: エンベディングと形態素・DB検索の並列化の検討 (しばらくは実装に着手しない)
    # 入力テキストのembeddingを先に計算しておく（意味的な近さの計算に使うため）
    # test_embedding = await _compute_text_embedding(text)

    # 形態素解析で検索対象の抽出
    search_targets = rd._extract_search_targets(text)
    if not search_targets:
        yield []
        return
    
    # dedup（複数の形態素が同じ単語を指す場合があるため）
    unique_terms = list(set(search_targets))
    unique_joined_terms = ["".join(term_tuple) for term_tuple in unique_terms]

    # DB検索(バッチで検索)
    results_term = _search_dictionary(unique_joined_terms)

    # hitはbest sense選択して返す (今は1単語1意味の想定なのでそのまま返す)
    yield _best_sense_selection(term_infos=results_term, text_embedding=[], source="db")
    
    # missの場合
    terms_db_miss = [term for term in unique_joined_terms if term not in {r.term for r in results_term}] 
    
    # missした用語の意味候補をLLMで生成
    result_senses = _generate_senses_for_terms(terms_db_miss, group_size=10)
    
    # senceそれぞれをエンベディング
    results_terms: list[TermInfo] = []
    for term, senses in result_senses.items():
        term_info = TermInfo(term=term, sense=[])
        for sense in senses:
            embedding = await _compute_text_embedding(sense)
            # DB保存のためのオブジェクトを作る
            term_info.sense.append((sense, embedding))
        results_terms.append(term_info)
    
    # TODO: DB保存をスレッドに分離して並列化し、書き込みの確認をせずにreturnすることも検討
    # DB保存
    pass
    # 最後にbest sense選択して返す
    yield _best_sense_selection(term_infos=results_terms, text_embedding=[], source="llm")

# ========================== Model ===================================

class TermInfo:
    """
    DBからヒットした用語情報を表すクラス
    Args:
        term: 用語
        sense: 用語の意味のリスト。各意味は (説明, embedding) のタプル
    """
    def __init__(self, term: str, sense: list[tuple[str, list[float]]]):
        self.term : str = term
        self.sence : list[tuple[str, list[float]]] = sense

# =========================== Domain ===================================

def _compute_text_embedding(text: str) -> list[float]:
    """
    入力テキストのembeddingを計算する関数
    外部APIを呼び出してembeddingを計算する想定
    Args:
        text: 入力テキスト
    Returns:
        embedding: テキストの意味を表すベクトル
    """
    try:
        pass
        embedding = embedding_model.call_embedding_api(text)
        return embedding
    except Exception as e:
        logger.exception("Embedding APIの呼び出しに失敗: %s\n ゼロベクトルを返します。", e)
        return [0 for _ in range(300)] # ダミー


def _search_dictionary(terms: list[str]) -> list[TermInfo]:
    """
    DBから複数の用語情報を検索する関数
    複合語を連結した文字列で検索する
    Args:
        terms: 検索する用語のリスト
    Returns:
        term_infos: 検索結果の用語情報のリスト
    """
    try:
        result = crud_dict.search_sense_dictionary(terms=terms)
    except Exception as e:
        logger.exception("DB検索に失敗: %s\n フォールバックとして空の結果を返します。", e)
        return []
    return [TermInfo(term=entry.term, sense=[(entry.description, entry.meaning_vector)]) for entry in result]


def _generate_senses_for_terms(terms: list[str], group_size: int = 10) -> dict[str, list[str]]:
    """
    辞書参照用に、用語ごとの意味候補をLLMで生成する。
    Args:
        terms: 意味候補を生成する用語のリスト
        group_size: 一度にLLMへ渡す用語数
    Returns:
        result_senses: 用語をキー、意味候補の配列を値にした辞書
    """
    result_senses: dict[str, list[str]] = {}
    prompts = _build_prompts(terms, group_size=group_size)

    for prompt in prompts:
        result_senses.update(llm.generate_json(prompt))
    return result_senses


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
    return [
        rd.DictionaryEntry(
            term=term_info.term, 
            description=term_info.sence[0][0], 
            meaning_vector=term_info.sence[0][1],
            source=source,
        ) \
        for term_info in term_infos
        ]

def _build_prompts(terms: list[str], group_size: int = 10) -> list[str]:
    """
    LLMに渡すプロンプトを生成する関数
    Args:
        terms: プロンプトを生成する用語のリスト
        group_size: 一度に処理する用語の数。LLMのトークン制限や処理時間を考慮して適切な値を設定する。
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
            以下の単語それぞれについて、日本語で使われる主要な意味を最大3つ出してください。

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
