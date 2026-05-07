"""
用語スコアの事前計算したIDFをDBに置くためのモデル。

会話とは独立したコーパス由来の値を ``lemma``（形態素基本形・API と同じキー）単位で保持する。
``app/services/idf_runtime`` がアプリ起動時に読み込み（``TERM_IDF_LOAD_MIN_VALUE`` により下限フィルタ可）、
以降はメモリの ``IdfLookupTable`` のみ参照し、スコア API のたびに SELECT はしない。
"""

from sqlalchemy import Column, Float, String

from app.models.dictionary import Base


class TermIdf(Base):
    """
    term_idf：各行が1単語に対応。lemma は形態素基本形の単語、idf_value はその語の事前計算したIDF。

    バッチなどで Upsert／ロードされるマスタであり、ランタイムの用語スコア（``idf_scaled`` バフ）の参照元となる。
    """

    __tablename__ = "term_idf"

    lemma = Column(String, primary_key=True, nullable=False)
    idf_value = Column(Float, nullable=False)
