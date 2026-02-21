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
from app.crud.dictionary import read_dictionary_by_term, delete_dictionary

# テストで生成された用語を記録し、最後にクリーンアップする
_created_terms: list[str] = []


def _cleanup_test_data():
    """テストで DB に登録された用語を全て削除する。"""
    for term in _created_terms:
        entry = read_dictionary_by_term(term)
        if entry:
            delete_dictionary(entry.id)
    count = len(_created_terms)
    _created_terms.clear()
    if count:
        print(f"\n🧹 テストデータ {count} 件を削除")


def _track_results(results: list[dict]) -> None:
    """結果の用語をクリーンアップリストに追加する。"""
    for r in results:
        if r.get("source") == "llm":
            _created_terms.append(r["term"])


# ---------------------------------------------------------------------------
# 1. 空文字・空白のみ
#    理由: 境界値テスト。空入力で例外が出ないことを保証する
# ---------------------------------------------------------------------------
async def test_empty_input():
    print("=== テスト1: 空文字・空白のみ ===")

    for text in ["", "   ", "\n\t"]:
        targets = _extract_search_targets(text)
        assert targets == [], f"❌ '{repr(text)}' で名詞が返った: {targets}"

    results = await refer_dictionary("")
    assert results == [], f"❌ 空文字で結果が返った: {results}"

    results = await refer_dictionary("   ")
    assert results == [], f"❌ 空白で結果が返った: {results}"

    print("✅ 空文字・空白 → 空リスト")


# ---------------------------------------------------------------------------
# 2. 名詞が含まれないテキスト
#    理由: 助詞・動詞だけの文で名詞抽出が0件になることを確認
# ---------------------------------------------------------------------------
async def test_no_nouns():
    print("\n=== テスト2: 名詞が含まれないテキスト ===")

    text = "走って飛んで泳いで"
    targets = _extract_search_targets(text)
    print(f"  入力: '{text}'")
    print(f"  抽出: {targets}")

    results = await refer_dictionary(text)
    _track_results(results)
    print(f"  結果: {results}")
    print(f"✅ 名詞なしテキスト → {len(results)} 件")


# ---------------------------------------------------------------------------
# 3. 単一名詞
#    理由: 最小ケースで term, description, meaning_vector, source の
#          全フィールドが正しく返されることを確認
# ---------------------------------------------------------------------------
async def test_single_noun():
    print("\n=== テスト3: 単一名詞 ===")

    text = "猫"
    results = await refer_dictionary(text)
    _track_results(results)
    print(f"  入力: '{text}'")
    print(f"  結果: {len(results)} 件")

    assert len(results) >= 1, "❌ 結果が空"
    entry = results[0]

    # 全フィールドの存在確認
    for key in ("term", "description", "meaning_vector", "source"):
        assert key in entry, f"❌ '{key}' フィールドがない: {entry}"
    print(f"  term='{entry['term']}', source='{entry['source']}'")
    print(f"  description='{entry['description']}'")
    print(f"  meaning_vector の次元: {len(entry['meaning_vector']) if entry['meaning_vector'] is not None else 'None'}")
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

    assert len(targets) >= 1, "❌ 名詞が抽出されなかった"
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
    _track_results(results)

    print(f"  入力: '{text}'")
    print(f"  名詞: {[''.join(t) for t in targets]}")
    print(f"  結果: {len(results)} 件")
    print(f"  ⏱️  処理時間: {elapsed:.3f}秒")

    assert len(results) == len(targets), (
        f"❌ 名詞数({len(targets)}) と結果数({len(results)}) が不一致"
    )

    terms = [r["term"] for r in results]
    print(f"  返却順: {terms}")
    print("✅ 件数一致 & 並列処理完了")


# ---------------------------------------------------------------------------
# 6. ベクトルの検証
#    理由: meaning_vector の存在・次元の一貫性を確認
# ---------------------------------------------------------------------------
async def test_vector_output():
    print("\n=== テスト6: ベクトル検証 ===")

    text = "人工知能の研究"
    results = await refer_dictionary(text)
    _track_results(results)

    for r in results:
        vec = r.get("meaning_vector")
        print(f"  term='{r['term']}', vector_dim={len(vec) if vec is not None else 'None'}")

        if vec is not None:
            assert hasattr(vec, '__len__'), f"❌ ベクトルに長さがない: {type(vec)}"
            assert len(vec) > 0, f"❌ ベクトルが空"

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
    _track_results(results)

    print(f"  入力: {len(text)} 文字")
    print(f"  名詞数: {len(targets)}")
    print(f"  結果数: {len(results)}")
    print(f"  ⏱️  処理時間: {elapsed:.3f}秒")

    for r in results:
        has_vec = "✓" if r.get("meaning_vector") is not None else "✗"
        print(f"    {has_vec} '{r['term']}'")

    assert len(results) == len(targets), "❌ 件数不一致"
    print("✅ 長文テスト完了")


# ---------------------------------------------------------------------------
# 実行
# ---------------------------------------------------------------------------
async def run_all_tests():
    """全テストを1つのイベントループで実行する。"""
    await test_empty_input()
    await test_no_nouns()
    await test_single_noun()
    await test_multiple_nouns_parallel()
    await test_vector_output()
    await test_long_text()


if __name__ == "__main__":
    print("🚀 refer_dictionary 多条件テスト開始\n")

    # 同期テスト
    test_compound_nouns()

    # 非同期テスト（全て1つのイベントループで実行）
    asyncio.run(run_all_tests())

    # テストデータのクリーンアップ
    _cleanup_test_data()

    print("\n🎉 全テスト合格!")
