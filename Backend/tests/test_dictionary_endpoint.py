import fastapi
from fastapi.testclient import TestClient

import app.api.endpoints.dictionary as dictionary_endpoint
from main import app

client = TestClient(app)


def test_dictionary_lookup_returns_200(monkeypatch) -> None:
    def _mock_lookup(term: str, context: str | None = None):
        _ = context
        return {
            "term": term,
            "summary": "RAGは回答時に外部情報を参照して根拠を補う手法です。",
            "source": "gemini",
            "model": "gemini-1.5-flash",
            "cached": False,
        }

    monkeypatch.setattr(dictionary_endpoint, "lookup_term_summary", _mock_lookup)

    res = client.post(
        "/dictionary/lookup",
        json={"term": "RAG", "context": "LLMの会話で出てきた用語"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["term"] == "RAG"
    assert body["source"] == "gemini"
    assert body["model"] == "gemini-1.5-flash"
    assert body["cached"] is False
    assert body["summary"]


def test_dictionary_lookup_validates_empty_term() -> None:
    res = client.post("/dictionary/lookup", json={"term": ""})
    assert res.status_code == 422


def test_dictionary_lookup_propagates_503(monkeypatch) -> None:
    def _raise_error(*_args, **_kwargs):
        raise fastapi.HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    monkeypatch.setattr(dictionary_endpoint, "lookup_term_summary", _raise_error)
    res = client.post("/dictionary/lookup", json={"term": "RAG"})

    assert res.status_code == 503
    assert res.json()["detail"] == "GEMINI_API_KEY is not configured"
