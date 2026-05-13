"""アプリ全体の設定値。

環境変数 DATABASE_ENV_KEY に、DB接続文字列を格納している環境変数名を指定できる。
未指定の場合は DATABASE_URL を使う。
例: DATABASE_ENV_KEY=DEV_DATABASE_URL
"""

from __future__ import annotations

import os


def get_database_url_env_key() -> str:
    """DB接続文字列を読む環境変数名を返す。"""
    return os.environ.get("DATABASE_ENV_KEY", "DATABASE_URL")


ZERO_VECTOR_300: list[float] = [0.0] * 300  # 300次元のゼロベクトル
