from fastapi.logger import logger

import Backend.app.services.refer_dictionary as rd
import Backend.app.services.text_analysis as txt_ana
import Backend.app.crud.dictionary as crud_dict

# ================================= Service ======================================

async def refer_dictionary(text: str) -> list[rd.DictionaryEntry]:
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
        return []
    
    # dedup（複数の形態素が同じ単語を指す場合があるため）
    unique_terms = list(set(search_targets))

    # DB検索(バッチで検索)
    results_term = search_dictionary(unique_terms)

    # hitはbest sense選択して返す (今は1単語1意味の想定なのでそのまま返す)
    pass

    # missの場合
    # プロンプト生成
    pass

    # 各グループごとにLLMで回答
    pass

    # senceそれぞれをエンベディング
    pass
    # TODO: DB保存をスレッドに分離して並列化し、書き込みの確認をせずにreturnすることも検討
    # DB保存
    pass
    # 最後にbest sense選択して返す
    pass
    return []


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
    フォールバックとして平均値を返す実装も入れておく
    Args:
        text: 入力テキスト
    Returns:
        embedding: テキストの意味を表すベクトル
    """
    try:
        pass
        # embedding = _call_embedding_api(text)
        # return embedding
    except Exception as e:
        logger.exception("Embedding APIの呼び出しに失敗: %s\n フォールバックとしてspaCyを使用します。", e)
        # フォールバック: textanalyze
        fallback_embedding = txt_ana.vectorize_sentence(text=text)
        return fallback_embedding
    logger.warning("Embedding APIの呼び出しに失敗しましたが、フォールバックも実装されていないため、ゼロベクトルを返します。")
    return [0 for _ in range(300)] # ダミー


def search_dictionary(terms: list[tuple[str,...]]) -> list[TermInfo]:
    """
    DBから複数の用語情報を検索する関数
    複合語を連結した文字列で検索する
    Args:
        terms: 検索する用語のリスト
    Returns:
        term_infos: 検索結果の用語情報のリスト
    """
    try:
        result = crud_dict.search_sense_dictionary(["".join(term_tuple) for term_tuple in terms])
    except Exception as e:
        logger.exception("DB検索に失敗: %s\n フォールバックとして空の結果を返します。", e)
        return []
    return [TermInfo(term=entry.term, sense=[(entry.description, entry.meaning_vector)]) for entry in result]


def _best_sense_selection(term_infos: list[TermInfo], text_embedding: list[float]) -> list[rd.DictionaryEntry]:
    """
        DBから複数エントリがヒットした場合の意味選択ロジック
        Args:
            term_infos: DBからヒットした用語情報のリスト
            text_embedding: 入力テキストのembedding
        Returns:
            best_info: term_infosの中でtext_embeddingに最も意味的に近い
    """
    
    pass







# ========================================================================

