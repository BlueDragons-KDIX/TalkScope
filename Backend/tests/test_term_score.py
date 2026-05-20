"""``app.services.term_score`` の連携テスト（モデル読み込みはモックで回避）。"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import pytest

_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))


@pytest.fixture
def ts(monkeypatch: pytest.MonkeyPatch):
    import app.services.term_score as term_score

    def fake_vectorize_sentence(text: str, normalize: bool = True) -> dict[str, Any]:
        vec = [0.0, 0.0, 1.0] if text.strip() else []
        return {
            "text": text,
            "meta": {
                "model": "stub",
                "vector_dim": len(vec),
                "content_token_count": 3,
                "input_token_count": 3,
                "normalize": normalize,
                "vector_source": "stub",
            },
            "sentence_vector": vec,
        }

    monkeypatch.setattr(term_score, "vectorize_sentence", fake_vectorize_sentence)
    return term_score


def test_morph_tokens_for_scoring_filters(monkeypatch: pytest.MonkeyPatch, ts: Any) -> None:
    fake_tokens = [
        {"surface": "僕", "base_form": "僕", "pos": "名詞-代名詞-一般", "start": 0, "end": 1},
        {"surface": "x", "base_form": "x", "pos": "名詞-普通名詞-一般", "start": 1, "end": 2},
        {"surface": "自然", "base_form": "自然", "pos": "名詞-普通名詞-一般", "start": 2, "end": 4},
        {"surface": "走る", "base_form": "走る", "pos": "動詞-一般", "start": 5, "end": 7},
    ]
    monkeypatch.setattr(ts, "morphological_analysis", lambda _text: fake_tokens)
    got = ts.morph_tokens_for_scoring("dummy")
    assert [m["base_form"] for m in got] == ["自然"]


def test_scoring_lemmas_and_bigrams(monkeypatch: pytest.MonkeyPatch, ts: Any) -> None:
    fake_tokens = [
        {"surface": "自然", "base_form": "自然", "pos": "名詞", "start": 0, "end": 2},
        {"surface": "言語", "base_form": "言語", "pos": "名詞", "start": 2, "end": 4},
    ]
    monkeypatch.setattr(ts, "morphological_analysis", lambda _text: fake_tokens)
    assert ts.scoring_lemmas_in_order("x") == ["自然", "言語"]
    bg = ts.adjacent_bigrams_for_scoring_text("x")
    assert bg[("自然", "言語")] == 1


def test_update_theme_ema_skipped_for_backchannel(monkeypatch: pytest.MonkeyPatch, ts: Any) -> None:
    called: list[str] = []

    def boom(_text: str, normalize: bool = True) -> dict[str, Any]:
        called.append("vectorize")
        return {"sentence_vector": [], "meta": {}}

    monkeypatch.setattr(ts, "vectorize_sentence", boom)
    prev = [1.0, 0.0, 0.0]
    out, updated, diag = ts.update_theme_ema_chunk("はい", prev, alpha=0.1)
    assert updated is False
    assert diag.get("skipped") is True
    assert out == prev
    assert called == []


def test_update_theme_ema_applies_step(monkeypatch: pytest.MonkeyPatch, ts: Any) -> None:
    monkeypatch.setattr(ts, "morph_tokens_for_scoring", lambda _text: [{"base_form": "a"}, {"base_form": "b"}])

    def fake_vs(text: str, normalize: bool = True) -> dict[str, Any]:
        return {
            "text": text,
            "meta": {"content_token_count": 5},
            "sentence_vector": [3.0, 4.0, 0.0],
        }

    monkeypatch.setattr(ts, "vectorize_sentence", fake_vs)
    new_theme, updated, diag = ts.update_theme_ema_chunk("APIを設計する", None, alpha=1.0)
    assert updated is True
    assert new_theme is not None
    assert pytest.approx(sum(x * x for x in new_theme), rel=1e-6) == 1.0
    assert "meta" in diag


def test_update_theme_ema_empty_vector(monkeypatch: pytest.MonkeyPatch, ts: Any) -> None:
    monkeypatch.setattr(ts, "morph_tokens_for_scoring", lambda _text: [{"base_form": "a"}, {"base_form": "b"}])

    def empty_vs(text: str = "", normalize: bool = True, **_kw: Any) -> dict[str, Any]:
        return {"text": text, "meta": {}, "sentence_vector": []}

    monkeypatch.setattr(ts, "vectorize_sentence", empty_vs)
    out, updated, diag = ts.update_theme_ema_chunk("x", [1.0, 0.0, 0.0], alpha=0.2)
    assert updated is False
    assert diag.get("reason") == "empty_sentence_vector"


def test_compute_term_scores_batch_does_not_call_morph_for_bigrams(
    monkeypatch: pytest.MonkeyPatch, ts: Any
) -> None:
    from app.schemas.score_analysis import TermScoreInput

    calls = 0

    def counting_morph(_text: str) -> list[dict[str, Any]]:
        nonlocal calls
        calls += 1
        return [
            {"surface": "自然", "base_form": "自然", "pos": "名詞", "start": 0, "end": 2},
            {"surface": "言語", "base_form": "言語", "pos": "名詞", "start": 2, "end": 4},
        ]

    monkeypatch.setattr(ts, "morphological_analysis", counting_morph)
    ts.compute_term_scores_for_request(
        "sess",
        [
            TermScoreInput(lemma="自然", occurrence_count=1, term_vector=[1.0, 0.0]),
            TermScoreInput(lemma="言語", occurrence_count=1, term_vector=[0.0, 1.0]),
        ],
    )
    assert calls == 0


def test_compute_term_score_additive_structure(monkeypatch: pytest.MonkeyPatch, ts: Any) -> None:
    from app.services.score_building_blocks import IdfLookupTable, count_axis_weight

    tbl = IdfLookupTable({"自然": 4.0})
    theme = [1.0, 0.0, 0.0]
    termv = [1.0, 0.0, 0.0]
    r = ts.compute_term_score_additive(
        "自然",
        occurrence_count=25,
        theme_vector=theme,
        term_vector=termv,
        idf_table=tbl,
        count_cap=100,
    )
    assert r["lemma"] == "自然"
    assert r["base"] == count_axis_weight(25, cap=100)
    assert isinstance(r["buffs"], dict)
    assert r["final"] >= 0.0
    assert "theme_linear" in r["buffs"]
    assert "idf_scaled" in r["buffs"]
