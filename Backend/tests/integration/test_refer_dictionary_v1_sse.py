from __future__ import annotations

import codecs
import json
import os
import time
from collections import Counter
from dataclasses import dataclass
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import bindparam, text

from main import app
from app.core.database import get_database
from app.services.refer_dictionary import _extract_search_targets


pytestmark = pytest.mark.integration

client = TestClient(app)
db = get_database()

FIRST_SEEN_TEXT = "量子計算と画像認識と音声合成"
MIXED_TEXT = "量子計算と画像認識と構文解析と知識検索"
CACHED_TEXT = "量子計算と画像認識と音声合成と構文解析と知識検索"


@dataclass(frozen=True)
class SseChunkResult:
    index: int
    elapsed: float
    lap: float
    raw: str
    payload: list[dict[str, Any]]


@dataclass(frozen=True)
class SsePhaseResult:
    name: str
    text: str
    started_at: float
    ended_at: float
    status_code: int
    chunks: list[SseChunkResult]

    @property
    def elapsed(self) -> float:
        return self.ended_at - self.started_at

    @property
    def entries(self) -> list[dict[str, Any]]:
        return [entry for chunk in self.chunks for entry in chunk.payload]


def _terms_in_text(text_value: str) -> list[str]:
    """
    refer_dictionary_v1 が実際に検索対象にする用語を返す。

    Args:
        text_value: 解析対象テキスト。
    Returns:
        terms: 形態素解析後に辞書検索される複合語リスト。
    """
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


def _prepare_dictionary_state() -> None:
    """
    SSEベンチ前に対象語だけを削除し、初出/混合/既出の差が見える状態にする。
    """
    terms = _benchmark_terms()
    _cleanup_terms(terms)
    print(f"\n🧹 SSEベンチマーク対象語 {len(terms)} 件を削除しました")


def _decode_utf8_strict(decoder: codecs.IncrementalDecoder, raw: bytes) -> str:
    """
    bytes chunk を UTF-8 strict でデコードする。文字化けや不正バイトは例外で検出する。

    Args:
        decoder: UTF-8 incremental decoder。
        raw: StreamingResponse から受け取った bytes。
    Returns:
        decoded: デコード済み文字列。
    """
    return decoder.decode(raw)


def _parse_sse_event(raw_event: str) -> list[dict[str, Any]]:
    """
    SSE event 文字列から data 行を取り出し、JSON payload に戻す。

    Args:
        raw_event: ``data: ...`` を含む1イベント分の文字列。
    Returns:
        payload: ResponseTermScore の辞書リスト。
    """
    data_lines = [
        line.removeprefix("data:").strip()
        for line in raw_event.splitlines()
        if line.startswith("data:")
    ]
    if not data_lines:
        return []
    payload = json.loads("\n".join(data_lines))
    assert isinstance(payload, list)
    for item in payload:
        assert isinstance(item, dict)
    return payload


def _call_sse_phase(name: str, text_value: str) -> SsePhaseResult:
    """
    SSE endpoint を1フェーズ実行し、chunk到着ごとのlapとUTF-8デコード結果を記録する。

    Args:
        name: フェーズ名。
        text_value: 解析対象テキスト。
    Returns:
        result: フェーズ内のchunk timingとpayload。
    """
    started_at = time.perf_counter()
    last_received_at = started_at
    chunks: list[SseChunkResult] = []
    buffer = ""
    decoder = codecs.getincrementaldecoder("utf-8")("strict")

    with client.stream(
        "POST",
        "/analysis/refer_dictionary_get_scores",
        json={"text": text_value},
    ) as response:
        status_code = response.status_code
        assert status_code == 200, (
            f"{name} failed: status={status_code}, body={response.read()!r}"
        )

        for raw_bytes in response.iter_bytes():
            received_at = time.perf_counter()
            decoded = _decode_utf8_strict(decoder, raw_bytes)
            assert "\ufffd" not in decoded, "UTF-8 replacement character was found"
            buffer += decoded

            while "\n\n" in buffer:
                raw_event, buffer = buffer.split("\n\n", maxsplit=1)
                if not raw_event.strip():
                    continue

                payload = _parse_sse_event(raw_event)
                raw_json = "\n".join(
                    line.removeprefix("data:").strip()
                    for line in raw_event.splitlines()
                    if line.startswith("data:")
                )
                assert "\\u" not in raw_json, (
                    "JSON payload contains unicode escapes; "
                    "ensure_ascii=False may not be applied"
                )

                chunks.append(
                    SseChunkResult(
                        index=len(chunks) + 1,
                        elapsed=received_at - started_at,
                        lap=received_at - last_received_at,
                        raw=raw_event,
                        payload=payload,
                    )
                )
                last_received_at = received_at

    tail = decoder.decode(b"", final=True)
    assert "\ufffd" not in tail, "UTF-8 replacement character was found in decoder tail"
    buffer += tail
    assert not buffer.strip(), f"Unparsed SSE buffer remained: {buffer!r}"

    return SsePhaseResult(
        name=name,
        text=text_value,
        started_at=started_at,
        ended_at=time.perf_counter(),
        status_code=status_code,
        chunks=chunks,
    )


def _source_counts(entries: list[dict[str, Any]]) -> Counter[str]:
    """
    返却エントリの source ごとの件数を数える。

    Args:
        entries: SSE payload を平坦化した辞書リスト。
    Returns:
        counts: source 名ごとの件数。
    """
    return Counter(str(entry.get("source", "unknown")) for entry in entries)


def _print_phase_result(result: SsePhaseResult) -> None:
    """
    フェーズ結果を人間が確認しやすい形で出力する。

    Args:
        result: SSEフェーズ結果。
    """
    counts = _source_counts(result.entries)
    expected_terms = _terms_in_text(result.text)

    print(f"\n[{result.name}]")
    print(f"text: {result.text}")
    print(f"expected terms: {expected_terms}")
    print(f"phase elapsed: {result.elapsed:.3f} sec")
    print(f"chunks: {len(result.chunks)}")
    print(f"entries: {len(result.entries)}")
    print(f"sources: db={counts['db']}, llm={counts['llm']}, unknown={counts['unknown']}")
    for chunk in result.chunks:
        print(
            f"  chunk {chunk.index}: "
            f"elapsed={chunk.elapsed:.3f} sec, "
            f"lap={chunk.lap:.3f} sec, "
            f"entries={len(chunk.payload)}"
        )
        for entry in chunk.payload:
            print(
                "    - "
                f"{entry.get('term')} "
                f"source={entry.get('source')} "
                f"score={entry.get('score')}"
            )


def _print_phase_gaps(results: list[SsePhaseResult]) -> None:
    """
    フェーズ間の空白時間を出力する。

    Args:
        results: 実行順に並んだフェーズ結果。
    """
    print("\n[phase gaps]")
    for prev, current in zip(results, results[1:], strict=False):
        gap = current.started_at - prev.ended_at
        print(f"{prev.name} -> {current.name}: gap={gap:.6f} sec")


@pytest.mark.skipif(not db.is_available, reason="DB is not available for integration test")
@pytest.mark.skipif(
    db.env_key != "DEV_DATABASE_URL",
    reason="SSE benchmark must run with DEV_DATABASE_URL",
)
def test_refer_dictionary_get_scores_sse_timing_and_utf8() -> None:
    """
    ユースケース:
    ユーザーがSSE endpointで辞書スコアを受け取り、各chunkの到着タイミングと
    日本語payloadのUTF-8デコードが壊れていないことを確認する。
    """
    if os.environ.get("REFER_DICTIONARY_V1_SSE_BENCHMARK", "").lower() not in {
        "1",
        "true",
        "yes",
    }:
        pytest.skip("Set REFER_DICTIONARY_V1_SSE_BENCHMARK=1 to run SSE benchmark")

    _prepare_dictionary_state()

    results = [
        _call_sse_phase("phase 1: first_seen", FIRST_SEEN_TEXT),
        _call_sse_phase("phase 2: mixed", MIXED_TEXT),
        _call_sse_phase("phase 3: cached", CACHED_TEXT),
    ]

    for result in results:
        _print_phase_result(result)
        assert result.chunks, f"{result.name} returned no SSE chunks"
        assert result.entries, f"{result.name} returned no entries"

    _print_phase_gaps(results)

    first_sources = _source_counts(results[0].entries)
    mixed_sources = _source_counts(results[1].entries)
    cached_sources = _source_counts(results[2].entries)

    assert first_sources["llm"] >= 1, "初出フェーズで LLM 取得がありません"
    assert mixed_sources["db"] >= 1, "混合フェーズで DB 取得がありません"
    assert mixed_sources["llm"] >= 1, "混合フェーズで LLM 取得がありません"
    assert cached_sources["db"] >= 1, "既出フェーズで DB 取得がありません"
    assert cached_sources["llm"] == 0, "既出フェーズで LLM 取得が発生しています"
