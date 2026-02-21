import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
from app.core.TransactionManager import TransactionManager


class Database:
    def __init__(self):
        db_uri = os.environ["DATABASE_URL"].replace(
            "postgresql://", "cockroachdb://"
        )
        try:
            self.engine = create_engine(
                db_uri,
                connect_args={"application_name": "docs_simplecrud_sqlalchemy"},
            )
            self.SessionLocal = sessionmaker(bind=self.engine)
        except Exception as e:
            print("Failed to connect to database.")
            print(f"{e}")

    def init_db(self):
        """モデル定義に基づいてテーブルを作成する（存在しなければ）"""
        Base.metadata.create_all(bind=self.engine)


# アプリ全体で共有するインスタンス
db = Database()
tx = TransactionManager(db.SessionLocal)