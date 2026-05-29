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
            "[dev/prod]: "
        ).strip().lower()
        if selected in {"dev", "development", "d"}:
            return "DEV_DATABASE_URL"
        if selected in {"production", "prod", "p"}:
            return "DATABASE_URL"
        print("dev または production を入力してください。")


ZERO_VECTOR_300: list[float] = [0.0] * 300  # 300次元のゼロベクトル


def _get_positive_int_env(name: str, default: int) -> int:
    """正の整数環境変数を読み、未設定・不正値なら default を返す。"""
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _get_csv_env(name: str) -> list[str]:
    """カンマ区切り環境変数を読み、空要素を除いたリストを返す。"""
    raw = os.environ.get(name, "").strip()
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


REFER_DICTIONARY_V1_GROUP_SIZE: int = _get_positive_int_env(
    "REFER_DICTIONARY_V1_GROUP_SIZE",
    10,
)
REFER_DICTIONARY_V1_GENERATE_MAX_SENSE: int = _get_positive_int_env(
    "REFER_DICTIONARY_V1_GENERATE_MAX_SENSE",
    3,
)
REFER_DICTIONARY_V1_EMBEDDING_BIAS_TEXT: str = os.environ.get(
    "REFER_DICTIONARY_V1_EMBEDDING_BIAS_TEXT",
    "",
).strip()
REFER_DICTIONARY_V1_EMBEDDING_BIAS_REPEAT: int = _get_positive_int_env(
    "REFER_DICTIONARY_V1_EMBEDDING_BIAS_REPEAT",
    1,
)
REFER_DICTIONARY_V1_TERM_BLACKLIST: list[str] = _get_csv_env(
    "REFER_DICTIONARY_V1_TERM_BLACKLIST"
)
