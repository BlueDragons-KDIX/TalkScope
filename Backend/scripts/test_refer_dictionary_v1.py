"""refer_dictionary_v1 を手動で動かすための簡易スクリプト。

Usage:
    cd Backend
    uv run python -m scripts.test_refer_dictionary_v1
"""

from __future__ import annotations

import asyncio
import time

from dotenv import load_dotenv

load_dotenv()

from app.core.database import get_database
from app.services.refer_dictionary_v1 import refer_dictionary


async def main() -> None:
    text = "人工知能と自然言語処理、情報処理を学ぶ"

    print(f"input: {text}")
    start = time.perf_counter()
    chunk_count = 0

    async for entries in refer_dictionary(text):
        chunk_count += 1
        elapsed = time.perf_counter() - start

        print(f"\n--- chunk {chunk_count} received at {elapsed:.6f} seconds ---")
        print(f"entries count: {len(entries)}")

        for entry in entries:
            print(type(entry))
            print(entry["term"],entry["source"])

    print("\nasync for finished")
    print(f"chunk count: {chunk_count}")


if __name__ == "__main__":
    # dbのセットアップ
    db = get_database()
    db.define_tables()
    print("========= Database tables defined =========")

    timer_start = time.perf_counter()
    asyncio.run(main())
    timer_end = time.perf_counter()
    print(f"\n⏱️  Total execution time: {timer_end - timer_start:.6f} seconds")
