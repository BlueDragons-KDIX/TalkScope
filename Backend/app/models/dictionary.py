from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone
from pgvector.sqlalchemy import Vector

Base = declarative_base()


class Dictionary(Base):

    __tablename__ = 'dictionary'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    term = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=False)
    meaning_vector = Column(Vector(300), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class TermTable(Base):
    __tablename__ = 'dictionary_terms'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    term = Column(String, unique=True, nullable=False)
    idf_wiki = Column(Integer, nullable=True, default=None)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
class InfoTable(Base):
    __tablename__ = 'dictionary_infos'
    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    term_id = Column(Integer, ForeignKey("dictionary_terms.id"), nullable=False)
    description = Column(String, nullable=False)
    meaning_vector = Column(Vector(300), nullable=False)
