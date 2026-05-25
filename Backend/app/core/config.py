"""互換用の設定モジュール。

新しい設定の実体は config.config に置く。
"""

from config.config import get_database_url_env_key

__all__ = ["get_database_url_env_key"]
