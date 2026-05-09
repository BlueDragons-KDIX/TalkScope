from fastapi.logger import logger

import app.services.text_analysis as txt_ana

def call_embedding_api(text: str) -> list[float]:
    """
    入力テキストのembeddingを計算する関数
    外部APIを呼び出してembeddingを計算する想定
    spCcyのenbeddingを呼び出す実装
    Args:
        text: 入力テキスト
    Returns:
        embedding: テキストの意味を表すベクトル
    """
    try:
        embedding = txt_ana.vectorize_sentence(text)
        return embedding
    except Exception as e:
        logger.exception("spaCyのベクトル化に失敗\n")
        raise e

