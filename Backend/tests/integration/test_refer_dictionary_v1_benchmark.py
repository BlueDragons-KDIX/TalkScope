from __future__ import annotations

import os
import time
from collections import Counter
from dataclasses import dataclass
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import bindparam, text

from main import app
from config.config import (
    REFER_DICTIONARY_V1_GENERATE_MAX_SENSE,
    REFER_DICTIONARY_V1_GROUP_SIZE,
)
from app.core.database import get_database
from app.services.refer_dictionary import _extract_search_targets


pytestmark = pytest.mark.integration

client = TestClient(app)
db = get_database()

if db.env_key != "DEV_DATABASE_URL":
    raise RuntimeError(
        "refer_dictionary_v1 benchmark must run with DEV_DATABASE_URL. "
        f"current env key is {db.env_key!r}."
    )


FIRST_SEEN_TEXT = "量子計算と画像認識と音声合成"
MIXED_TEXT = "量子計算と画像認識と構文解析と知識検索"
CACHED_TEXT = "量子計算と画像認識と音声合成と構文解析と知識検索"


@dataclass(frozen=True)
class PhaseResult:
    name: str
    text: str
    elapsed: float
    entries: list[dict[str, Any]]


def _terms_in_text(text_value: str) -> list[str]:
    """refer_dictionary_v1 が実際に検索対象にする用語を返す。"""
    return ["".join(parts) for parts in _extract_search_targets(text_value)]


def _benchmark_terms() -> list[str]:
    """
    3フェーズで使う用語を重複除去して返す。

    Returns:
        terms: ベンチマーク対象の用語リスト。
    """
    terms: list[str] = []
    for text_value in (FIRST_SEEN_TEXT, MIXED_TEXT, CACHED_TEXT):
        terms.extend(_terms_in_text(text_value))
    return list(dict.fromkeys(terms))


def _cleanup_terms(terms: list[str]) -> None:
    """
    v1用テーブルからベンチマーク対象語を削除する。

    Args:
        terms: 削除対象の用語リスト。
    """
    if not terms or not db.is_available:
        return

    delete_infos = text(
        """
        DELETE FROM dictionary_infos
        WHERE term_id IN (
            SELECT id FROM dictionary_terms WHERE term IN :terms
        )
        """
    ).bindparams(bindparam("terms", expanding=True))
    delete_terms = text(
        "DELETE FROM dictionary_terms WHERE term IN :terms"
    ).bindparams(bindparam("terms", expanding=True))

    with db.engine.begin() as conn:
        conn.execute(delete_infos, {"terms": terms})
        conn.execute(delete_terms, {"terms": terms})


def _reset_v1_tables_if_explicitly_allowed() -> bool:
    """専用DBで明示された場合だけ v1 用テーブル全体を空にする。"""
    reset_enabled = os.environ.get("REFER_DICTIONARY_V1_BENCHMARK_RESET", "").lower()
    reset_enabled = reset_enabled in {"1", "true", "yes", "table"}
    using_dev_db = os.environ.get("DATABASE_ENV_KEY") == "DEV_DATABASE_URL"

    if not reset_enabled:
        return False
    if not using_dev_db:
        raise AssertionError(
            "v1テーブル全リセットには DATABASE_ENV_KEY=DEV_DATABASE_URL が必要です"
        )
    if not db.is_available:
        return False

    with db.engine.begin() as conn:
        conn.execute(text("DELETE FROM dictionary_infos"))
        conn.execute(text("DELETE FROM dictionary_terms"))
    return True


def _prepare_dictionary_state() -> None:
    """
    ベンチマーク前に対象語だけを削除し、フェーズ結果が読みやすい状態にする。

    テーブル全体の削除は明示的な環境変数がある場合だけ行う。
    """
    terms = _benchmark_terms()
    print(
        "\n⚙️ v1 config: "
        f"group_size={REFER_DICTIONARY_V1_GROUP_SIZE}, "
        f"generate_max_sense={REFER_DICTIONARY_V1_GENERATE_MAX_SENSE}"
    )
    reset_done = _reset_v1_tables_if_explicitly_allowed()
    if reset_done:
        print("\n🧹 dictionary_terms / dictionary_infos を全体リセットしました")
        return

    _cleanup_terms(terms)
    print(f"\n🧹 v1ベンチマーク対象語 {len(terms)} 件を削除しました")


def _call_phase(name: str, text_value: str) -> PhaseResult:
    """
    v1 endpoint を1フェーズ実行し、経過時間と返却エントリを記録する。

    Args:
        name: フェーズ名。
        text_value: 解析対象テキスト。
    Returns:
        result: フェーズごとのベンチマーク結果。
    """
    start = time.perf_counter()
    response = client.post("/analysis/refer_dictionary_v1_test", json={"text": text_value})
    elapsed = time.perf_counter() - start

    if response.status_code in {502, 503, 504}:
        pytest.skip(
            f"{name} skipped because an external service is unavailable: "
            f"status={response.status_code}, body={response.text}"
        )

    assert response.status_code == 200, (
        f"{name} failed: status={response.status_code}, body={response.text}"
    )
    body = response.json()
    entries = body.get("entries", [])
    assert isinstance(entries, list)
    return PhaseResult(name=name, text=text_value, elapsed=elapsed, entries=entries)


def _source_counts(entries: list[dict[str, Any]]) -> Counter[str]:
    """返却エントリの source ごとの件数を数える。"""
    return Counter(str(entry.get("source", "unknown")) for entry in entries)


def _print_phase_result(result: PhaseResult) -> None:
    """
    フェーズ結果を人間が確認しやすい形で出力する。

    Args:
        result: フェーズごとのベンチマーク結果。
    """
    counts = _source_counts(result.entries)
    expected_terms = _terms_in_text(result.text)

    print(f"\n[{result.name}]")
    print(f"text: {result.text}")
    print(f"expected terms: {expected_terms}")
    print(f"elapsed: {result.elapsed:.3f} sec")
    print(f"entries: {len(result.entries)}")
    print(f"sources: db={counts['db']}, llm={counts['llm']}, unknown={counts['unknown']}")
    print("terms:")
    for entry in result.entries:
        print(f"  - {entry.get('term')}: {entry.get('source')}")


@pytest.mark.skipif(not db.is_available, reason="DB is not available for integration test")
def test_refer_dictionary_v1_three_phase_benchmark() -> None:
    """
    v1 serviceを初出、混合、既出の3フェーズで実行し、DB/LLMの返却比率と速度を見る。
    """
    _prepare_dictionary_state()

    first_seen = _call_phase("phase 1: first_seen", FIRST_SEEN_TEXT)
    mixed = _call_phase("phase 2: mixed", MIXED_TEXT)
    cached = _call_phase("phase 3: cached", CACHED_TEXT)

    for result in (first_seen, mixed, cached):
        _print_phase_result(result)

    first_sources = _source_counts(first_seen.entries)
    mixed_sources = _source_counts(mixed.entries)
    cached_sources = _source_counts(cached.entries)

    assert first_sources["llm"] >= 1, "初出フェーズで LLM 取得がありません"
    assert mixed_sources["db"] >= 1, "混合フェーズで DB 取得がありません"
    assert mixed_sources["llm"] >= 1, "混合フェーズで LLM 取得がありません"
    assert cached_sources["db"] >= 1, "既出フェーズで DB 取得がありません"
    assert cached_sources["llm"] == 0, "既出フェーズで LLM 取得が発生しています"
