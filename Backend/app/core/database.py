"""データベース接続管理モジュール。

DATABASE_URL が未設定の場合は DB 機能を無効化し、
アプリの他の機能（/analysis など）は正常に動作する。
"""

import logging
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
from app.core.TransactionManager import TransactionManager

logger = logging.getLogger(__name__)


class Database:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None

        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            logger.warning(
                "DATABASE_URL が未設定のため、DB 機能は無効です。"
            )
            return

        db_uri = db_url.replace("postgresql://", "cockroachdb://")
        try:
            self.engine = create_engine(
                db_uri,
                connect_args={"application_name": "docs_simplecrud_sqlalchemy"},
            )
            self.SessionLocal = sessionmaker(bind=self.engine)
        except Exception as e:
            logger.error("Failed to connect to database: %s", e)

    @property
    def is_available(self) -> bool:
        """DB 接続が利用可能かどうか。"""
        return self.engine is not None and self.SessionLocal is not None

    def init_db(self):
        """モデル定義に基づいてテーブルを作成する（存在しなければ）"""
        if not self.is_available:
            logger.warning("DB 未接続のため init_db をスキップしました。")
            return
        Base.metadata.create_all(bind=self.engine)


# アプリ全体で共有するインスタンス
db = Database()

# DB が利用可能な場合のみ TransactionManager を初期化
tx = TransactionManager(db.SessionLocal) if db.is_available else None