"""アプリ全体の設定値。

環境変数 DATABASE_ENV_KEY に、DB接続文字列を格納している環境変数名を指定できる。
未指定の場合は dev / production のどちらを使うか起動時に確認する。
例: DATABASE_ENV_KEY=DEV_DATABASE_URL
"""

from __future__ import annotations

import os
import sys


def get_database_url_env_key() -> str:
    """DB接続文字列を読む環境変数名を返す。"""
    env_key = os.environ.get("DATABASE_ENV_KEY")
    if env_key:
        return env_key

    if not sys.stdin.isatty():
        raise RuntimeError(
            "DATABASE_ENV_KEY is not set. "
            "Set DATABASE_ENV_KEY to DEV_DATABASE_URL or DATABASE_URL."
        )

    while True:
        selected = input(
            "DATABASE_ENV_KEY が未指定です。使用するDBを選んでください "
            "[dev/production]: "
        ).strip().lower()
        if selected in {"dev", "development", "d"}:
            return "DEV_DATABASE_URL"
        if selected in {"production", "prod", "p"}:
            return "DATABASE_URL"
        print("dev または production を入力してください。")


ZERO_VECTOR_300: list[float] = [0.0] * 300  # 300次元のゼロベクトル
REFER_DICTIONARY_V1_GROUP_SIZE: int = 10
REFER_DICTIONARY_V1_GENERATE_MAX_SENSE: int = 3
