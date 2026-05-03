"""用語スコア用 IDF を保持する語彙テーブル（lemma は形態素基本形・API と揃える）。"""

from sqlalchemy import Column, Float, String

from app.models.dictionary import Base


class TermIdf(Base):
    __tablename__ = "term_idf"

    lemma = Column(String, primary_key=True, nullable=False)
    idf_value = Column(Float, nullable=False)
