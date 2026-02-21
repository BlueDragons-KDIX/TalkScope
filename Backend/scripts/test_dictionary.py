"""
dictionary テーブルの基本動作テスト（処理時間計測付き）。

実際の CockroachDB に接続してテストを行う。
実行方法:
    cd Backend
    uv run python -m scripts.test_dictionary
"""
from dotenv import load_dotenv
load_dotenv()

import time

from app.crud.dictionary import (
    create_dictionary,
    read_dictionary_by_term,
    delete_dictionary,
)


def test_create_and_read():
    """用語を追加し、取得できることを確認"""
    print("\n=== テスト: 用語追加 & 取得 ===")

    term = "test_apple"
    description = "テスト用りんごの説明"
    dummy_vector = [0.0] * 300

    # 前回のテストデータが残っていたら削除
    old_entry = read_dictionary_by_term(term)
    if old_entry:
        delete_dictionary(old_entry.id)
        print(f"🧹 前回のテストデータを削除: id={old_entry.id}")

    # 追加
    start = time.perf_counter()
    idx = create_dictionary(term, description, meaning_vector=dummy_vector)
    create_time = time.perf_counter() - start
    print(f"✅ 用語追加成功: id={idx}  ⏱️ {create_time:.3f}秒")

    # 取得
    start = time.perf_counter()
    entry = read_dictionary_by_term(term)
    read_time = time.perf_counter() - start
    assert entry is not None, f"❌ '{term}' が見つからない"
    assert entry.id == idx, f"❌ id が一致しない: expected={idx}, got={entry.id}"
    assert entry.term == term, f"❌ term が一致しない: {entry.term}"
    assert entry.description == description, f"❌ description が一致しない: {entry.description}"
    print(f"✅ 用語取得成功: id={entry.id}  ⏱️ {read_time:.3f}秒")

    return idx


def test_delete(idx: int):
    """用語を削除できることを確認"""
    print("\n=== テスト: 用語削除 ===")

    start = time.perf_counter()
    delete_dictionary(idx)
    delete_time = time.perf_counter() - start

    start = time.perf_counter()
    entry = read_dictionary_by_term("test_apple")
    read_time = time.perf_counter() - start

    assert entry is None, f"❌ 削除されていない: id={entry.id}"
    print(f"✅ 用語削除成功: id={idx}  ⏱️ {delete_time:.3f}秒")
    print(f"  （削除確認の検索: {read_time:.3f}秒）")


if __name__ == "__main__":
    print("🚀 dictionary テスト開始\n")

    total_start = time.perf_counter()
    idx = test_create_and_read()
    test_delete(idx)
    total_time = time.perf_counter() - total_start

    print(f"\n🎉 全テスト合格!  ⏱️ 合計: {total_time:.3f}秒")
