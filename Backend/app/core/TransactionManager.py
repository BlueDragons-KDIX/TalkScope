"""
トランザクションのリトライ処理を提供するモジュール。

書き込み競合（SQLSTATE 40001: serialization_failure）が発生した場合、
指数バックオフ + ジッターで自動リトライする。
"""

import logging
import random
import time
from typing import Callable, TypeVar

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

T = TypeVar("T")


class TransactionManager:
    """セッション生成とトランザクションリトライを管理するクラス。

    Usage:
        tx = TransactionManager(SessionLocal)
        result = tx.run(lambda session: session.query(Account).all())
    """

    def __init__(self, session_factory: sessionmaker, max_retries: int = 5):
        self.session_factory = session_factory
        self.max_retries = max_retries

    def run(self, fn: Callable[[Session], T]) -> T:
        """トランザクション内で fn を実行し、失敗時はリトライする。

        Args:
            fn: Session を受け取り、任意の値を返すコールバック。

        Returns:
            fn の戻り値。

        Raises:
            OperationalError: リトライ対象外の DB エラー。
            RuntimeError: リトライ上限に達した場合。
        """
        for attempt in range(self.max_retries):
            session: Session = self.session_factory()
            try:
                result = fn(session)
                session.commit()
                return result

            except OperationalError as e:
                session.rollback()

                if "40001" not in str(e):
                    raise

                sleep = (2 ** attempt) * 0.05 + random.uniform(0, 0.05)
                logger.warning(
                    "Transaction conflict (attempt %d/%d). Retrying in %.3fs...",
                    attempt + 1,
                    self.max_retries,
                    sleep,
                )
                time.sleep(sleep)

            finally:
                session.close()

        raise RuntimeError(
            f"Transaction retry limit exceeded ({self.max_retries} attempts)"
        )
