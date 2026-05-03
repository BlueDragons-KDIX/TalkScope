"""用語スコア／テーマ API の軽い疎通（モデル読み込みは ``update_theme_ema_chunk`` をモックして回避）。"""

from __future__ import annotations

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_sessions():
    from app.services.term_score import clear_all_sessions

    clear_all_sessions()
    yield
    clear_all_sessions()


def test_theme_chunk_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.term_score.update_theme_ema_chunk",
        lambda *_a, **_kw: ([], False, {"skipped": True}),
    )
    res = client.post(
        "/analysis/theme/chunk",
        json={"session_id": "s1", "text": "うん"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["updated"] is False
    assert body["theme_vector"] == []


def test_theme_chunk_persists(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_update(
        text: str,
        theme: list[float] | None,
        alpha: float,
        *,
        normalize_sentence: bool = True,
        min_content_tokens: int = 2,
    ):
        vec = [0.6, 0.8]
        assert alpha == pytest.approx(0.05)
        return vec, True, {"skipped": False}

    monkeypatch.setattr("app.services.term_score.update_theme_ema_chunk", fake_update)

    res = client.post(
        "/analysis/theme/chunk",
        json={"session_id": "s2", "text": "チャンク", "alpha": 0.05},
    )
    assert res.status_code == 200
    assert res.json()["updated"] is True
    assert res.json()["theme_vector"] == [0.6, 0.8]

    res2 = client.post(
        "/analysis/score/terms",
        json={
            "session_id": "s2",
            "chunk_text_for_bigrams": "自然 言語",
            "terms": [
                {"lemma": "自然", "occurrence_count": 5, "term_vector": [0.6, 0.8]},
            ],
            "weights": {"theme_sim_weight": 1.0, "ppmi_weight": 0.0, "count_cap": 100},
        },
    )
    assert res2.status_code == 200
    r0 = res2.json()["results"][0]
    assert r0["lemma"] == "自然"
    assert r0["final"] >= 0.0
    assert "theme_linear" in r0["buffs"]
    assert res2.json()["theme_vector_used"] == [0.6, 0.8]


def test_theme_session_reset() -> None:
    from app.services.term_score import set_theme

    set_theme("s3", [1.0, 2.0])
    res = client.post("/analysis/theme/session/reset", json={"session_id": "s3"})
    assert res.status_code == 200
    assert res.json()["cleared"] is True
    res2 = client.post("/analysis/theme/session/reset", json={"session_id": "s3"})
    assert res2.json()["cleared"] is False


def test_score_terms_validation() -> None:
    res = client.post(
        "/analysis/score/terms",
        json={
            "session_id": "",
            "chunk_text_for_bigrams": "",
            "terms": [],
        },
    )
    assert res.status_code == 422
