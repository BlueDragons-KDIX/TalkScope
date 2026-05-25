from fastapi.logger import logger

from config.config import ZERO_VECTOR_300
import app.services.text_analysis as txt_ana


TARGET_VECTOR_DIM = 300


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
        result = txt_ana.vectorize_sentence(text)
        sentence_vector = result["sentence_vector"]
        if sentence_vector is None:
            logger.warning("テキストのベクトル化結果が空です。ゼロベクトルを返します。")
            return ZERO_VECTOR_300.copy()
        if len(sentence_vector) != TARGET_VECTOR_DIM:
            logger.warning("ベクトルの次元数が300ではありません。ゼロで埋めます。")
            return _resize_vector(sentence_vector, TARGET_VECTOR_DIM)
        return sentence_vector
    except Exception as e:
        logger.exception("spaCyのベクトル化に失敗\n")
        raise e


def _resize_vector(vector: list[float], target_dim: int) -> list[float]:
    if len(vector) >= target_dim:
        return vector[:target_dim]
    return vector + [0.0] * (target_dim - len(vector))
