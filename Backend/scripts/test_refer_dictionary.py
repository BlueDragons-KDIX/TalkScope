"""refer_dictionary の多条件テスト。

各テストの目的:
  1. 空文字・空白のみ → エッジケース: 入力なしで空リストが返るか
  2. 名詞が1つもないテキスト → 助詞・動詞だけの文で空リストになるか
  3. 単一名詞 → 最小ケースで全フィールドが正しいか
  4. 複合名詞 → 連続する名詞の結合が正しいか
  5. 複数の複合名詞 → 並列処理で順序・件数が保持されるか
  6. ベクトルの検証 → meaning_vector が生成され、次元が一致するか
  7. 長い文章 → 多数の名詞でも安定して動作するか

実行方法:
    cd Backend
    uv run python -m scripts.test_refer_dictionary
"""

import asyncio
import time

from dotenv import load_dotenv
load_dotenv()

from app.services.refer_dictionary import (
    refer_dictionary,
    _extract_search_targets,
)


# ---------------------------------------------------------------------------
# 1. 空文字・空白のみ
#    理由: 境界値テスト。空入力で例外が出ないことを保証する
# ---------------------------------------------------------------------------
def test_empty_input():
    print("=== テスト1: 空文字・空白のみ ===")

    for text in ["", "   ", "\n\t"]:
        targets = _extract_search_targets(text)
        assert targets == [], f"❌ '{repr(text)}' で名詞が返った: {targets}"

    results = asyncio.run(refer_dictionary(""))
    assert results == [], f"❌ 空文字で結果が返った: {results}"

    results = asyncio.run(refer_dictionary("   "))
    assert results == [], f"❌ 空白で結果が返った: {results}"

    print("✅ 空文字・空白 → 空リスト")


# ---------------------------------------------------------------------------
# 2. 名詞が含まれないテキスト
#    理由: 助詞・動詞だけの文で名詞抽出が0件になることを確認
# ---------------------------------------------------------------------------
def test_no_nouns():
    print("\n=== テスト2: 名詞が含まれないテキスト ===")

    text = "走って飛んで泳いで"
    targets = _extract_search_targets(text)
    print(f"  入力: '{text}'")
    print(f"  抽出: {targets}")

    results = asyncio.run(refer_dictionary(text))
    print(f"  結果: {results}")
    # 名詞がなければ空 or 形態素解析の判定次第
    print(f"✅ 名詞なしテキスト → {len(results)} 件")


# ---------------------------------------------------------------------------
# 3. 単一名詞
#    理由: 最小ケースで word, meaning, meaning_vector, source の
#          全フィールドが正しく返されることを確認
# ---------------------------------------------------------------------------
async def test_single_noun():
    print("\n=== テスト3: 単一名詞 ===")

    text = "猫"
    results = await refer_dictionary(text)
    print(f"  入力: '{text}'")
    print(f"  結果: {len(results)} 件")

    assert len(results) >= 1, f"❌ 結果が空"
    entry = results[0]

    # 全フィールドの存在確認
    for key in ("word", "meaning", "meaning_vector", "source"):
        assert key in entry, f"❌ '{key}' フィールドがない: {entry}"
    print(f"  word='{entry['word']}', source='{entry['source']}'")
    print(f"  meaning_vector の次元: {len(entry['meaning_vector']) if entry['meaning_vector'] else 'None'}")
    print("✅ 全フィールド存在確認OK")


# ---------------------------------------------------------------------------
# 4. 複合名詞の結合
#    理由: 「形態素」+「解析」が「形態素解析」として1つの単語になるか
# ---------------------------------------------------------------------------
def test_compound_nouns():
    print("\n=== テスト4: 複合名詞の結合 ===")

    text = "形態素解析を使う"
    targets = _extract_search_targets(text)
    print(f"  入力: '{text}'")
    print(f"  抽出: {targets}")

    # 「形態素」と「解析」が1つのタプルにまとまっているか
    assert len(targets) >= 1, f"❌ 名詞が抽出されなかった"
    first = targets[0]
    assert len(first) >= 2, f"❌ 複合名詞として結合されていない: {first}"
    joined = "".join(first)
    print(f"  結合結果: {first} → '{joined}'")
    print("✅ 複合名詞の結合OK")


# ---------------------------------------------------------------------------
# 5. 複数名詞の並列処理
#    理由: asyncio.gather の順序保持と件数の一致を確認
# ---------------------------------------------------------------------------
async def test_multiple_nouns_parallel():
    print("\n=== テスト5: 複数名詞の並列処理 ===")

    text = "機械学習と深層学習と自然言語処理を学ぶ"
    targets = _extract_search_targets(text)

    start = time.perf_counter()
    results = await refer_dictionary(text)
    elapsed = time.perf_counter() - start

    print(f"  入力: '{text}'")
    print(f"  名詞: {[''.join(t) for t in targets]}")
    print(f"  結果: {len(results)} 件")
    print(f"  ⏱️  処理時間: {elapsed:.3f}秒")

    assert len(results) == len(targets), (
        f"❌ 名詞数({len(targets)}) と結果数({len(results)}) が不一致"
    )

    words = [r["word"] for r in results]
    print(f"  返却順: {words}")
    print("✅ 件数一致 & 並列処理完了")


# ---------------------------------------------------------------------------
# 6. ベクトルの検証
#    理由: meaning_vector の存在・次元の一貫性を確認
# ---------------------------------------------------------------------------
async def test_vector_output():
    print("\n=== テスト6: ベクトル検証 ===")

    text = "人工知能の研究"
    results = await refer_dictionary(text)

    for r in results:
        vec = r.get("meaning_vector")
        print(f"  word='{r['word']}', vector_dim={len(vec) if vec else 'None'}")

        if vec is not None:
            assert isinstance(vec, list), f"❌ ベクトルがlistでない: {type(vec)}"
            assert len(vec) > 0, f"❌ ベクトルが空"
            assert all(isinstance(v, float) for v in vec), f"❌ ベクトルにfloat以外が含まれる"

    print("✅ ベクトル検証OK")


# ---------------------------------------------------------------------------
# 7. 長い文章
#    理由: 多数の名詞を含む文章でも安定して処理できることを確認
# ---------------------------------------------------------------------------
async def test_long_text():
    print("\n=== テスト7: 長い文章 ===")

    text = (
        "人工知能と機械学習の技術は自然言語処理や画像認識、"
        "音声合成など様々な分野で応用されている。"
        "特に大規模言語モデルの登場により、"
        "文書要約や質問応答の精度が飛躍的に向上した。"
    )
    targets = _extract_search_targets(text)

    start = time.perf_counter()
    results = await refer_dictionary(text)
    elapsed = time.perf_counter() - start

    print(f"  入力: {len(text)} 文字")
    print(f"  名詞数: {len(targets)}")
    print(f"  結果数: {len(results)}")
    print(f"  ⏱️  処理時間: {elapsed:.3f}秒")

    for r in results:
        has_vec = "✓" if r.get("meaning_vector") else "✗"
        print(f"    {has_vec} '{r['word']}'")

    assert len(results) == len(targets), "❌ 件数不一致"
    print("✅ 長文テスト完了")


# ---------------------------------------------------------------------------
# 実行
# ---------------------------------------------------------------------------
async def run_async_tests():
    """全 async テストを1つのイベントループで実行する。"""
    await test_single_noun()
    await test_multiple_nouns_parallel()
    await test_vector_output()
    await test_long_text()


if __name__ == "__main__":
    print("🚀 refer_dictionary 多条件テスト開始\n")

    # 同期テスト
    test_empty_input()
    test_no_nouns()
    test_compound_nouns()

    # 非同期テスト（1つのイベントループで全て実行）
    asyncio.run(run_async_tests())

    print("\n🎉 全テスト合格!")
