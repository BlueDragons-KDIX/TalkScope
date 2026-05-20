"""データベース接続管理モジュール。

DATABASE_URL が未設定の場合は DB 機能を無効化し、
アプリの他の機能（/analysis など）は正常に動作する。
"""

import logging
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.config import get_database_url_env_key
from app.models import Base
from app.core.TransactionManager import TransactionManager

logger = logging.getLogger(__name__)
_db_instance: "Database | None" = None
_tx_instance: TransactionManager | None = None


class Database:
    def __init__(self, env_key: str = "DATABASE_URL"):
        self.env_key = env_key
        self.engine = None
        self.SessionLocal = None

        db_url = os.environ.get(env_key)
        if not db_url:
            logger.warning(
                "%s が未設定のため、DB 機能は無効です。", env_key
            )
            return

        # db_uri = db_url.replace("postgresql://", "cockroachdb://")
        try:
            self.engine = create_engine(
                db_url,
                connect_args={"application_name": "docs_simplecrud_sqlalchemy"},
            )
            self.SessionLocal = sessionmaker(bind=self.engine)
        except Exception as e:
            logger.error("Failed to connect to database: %s", e)

    @property
    def is_available(self) -> bool:
        """DB 接続が利用可能かどうか。"""
        return self.engine is not None and self.SessionLocal is not None

    def define_tables(self) -> None:
        """モデル定義に基づいてテーブルを作成する（存在しなければ）"""
        if not self.is_available:
            logger.warning("DB 未接続のため define_tables をスキップしました。")
            return
        Base.metadata.create_all(bind=self.engine)

    def init_db(self) -> None:
        """DB 初期化処理。現時点ではテーブル定義の作成を行う。"""
        self.define_tables()

# =====================================================

def get_database() -> Database:
    """アプリ全体で共有する DB インスタンスを返す。"""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database(env_key=get_database_url_env_key())
    return _db_instance


def get_transaction_manager() -> TransactionManager | None:
    """アプリ全体で共有する TransactionManager を返す。"""
    global _tx_instance
    if _tx_instance is None:
        db = get_database()
        if db.is_available:
            _tx_instance = TransactionManager(db.SessionLocal)
    return _tx_instance


def reset_database_instances() -> None:
    """テストなどで DB 接続先を切り替える前に共有インスタンスを破棄する。"""
    global _db_instance, _tx_instance
    _db_instance = None
    _tx_instance = None
