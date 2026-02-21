from sqlalchemy import Column, Integer, String, DateTime
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