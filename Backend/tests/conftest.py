"""pytest 共通設定。

テスト実行時は必ず DEV_DATABASE_URL を使う。
"""

from __future__ import annotations

import os


os.environ["DATABASE_ENV_KEY"] = "DEV_DATABASE_URL"
