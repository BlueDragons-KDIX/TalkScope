import fastapi
import pytest

import app.services.dictionary as dictionary_service


def test_lookup_term_summary_returns_gemini_result(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_service, "_lookup_term_from_db", lambda _term: None)
    monkeypatch.setattr(
        dictionary_service,
        "_call_gemini",
        lambda _prompt: ("RAGは外部情報を参照して回答の根拠を補う手法です。", "gemini-1.5-flash"),
    )

    result = dictionary_service.lookup_term_summary("  RAG  ", context="LLMの会話で出てきた用語")

    assert result["term"] == "RAG"
    assert result["summary"] == "RAGは外部情報を参照して回答の根拠を補う手法です。"
    assert result["source"] == "gemini"
    assert result["model"] == "gemini-1.5-flash"
    assert result["cached"] is False


def test_lookup_terms_summaries_returns_multiple_results(monkeypatch) -> None:
    async def _mock_async_lookup(terms: list[str], context: str | None):
        assert context == "技術会話で出た用語"
        return [
            {
                "term": term,
                "summary": f"{term}の説明です。",
                "source": "gemini",
                "model": "gemini-1.5-flash",
                "cached": False,
            }
            for term in terms
        ]

    monkeypatch.setattr(dictionary_service, "_lookup_terms_individually_async", _mock_async_lookup)

    results = dictionary_service.lookup_terms_summaries(
        [" RAG ", "MCP"],
        context="技術会話で出た用語",
    )

    assert len(results) == 2
    assert results[0]["term"] == "RAG"
    assert results[1]["term"] == "MCP"


def test_call_gemini_raises_503_when_api_key_missing(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_service, "GEMINI_API_KEY", None)

    with pytest.raises(fastapi.HTTPException) as exc_info:
        dictionary_service._call_gemini("test prompt")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "GEMINI_API_KEY is not configured"


def test_call_gemini_raises_504_on_timeout(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_service, "GEMINI_API_KEY", "dummy-key")

    def _raise_timeout(*_args, **_kwargs):
        raise dictionary_service.httpx.TimeoutException("timed out")

    monkeypatch.setattr(dictionary_service.httpx, "post", _raise_timeout)

    with pytest.raises(fastapi.HTTPException) as exc_info:
        dictionary_service._call_gemini("test prompt")

    assert exc_info.value.status_code == 504
    assert exc_info.value.detail == "Gemini API request timed out"


def test_call_gemini_raises_502_on_invalid_payload(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_service, "GEMINI_API_KEY", "dummy-key")

    class _FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self):
            return {"unexpected": "payload"}

    monkeypatch.setattr(dictionary_service.httpx, "post", lambda *_args, **_kwargs: _FakeResponse())

    with pytest.raises(fastapi.HTTPException) as exc_info:
        dictionary_service._call_gemini("test prompt")

    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == "Gemini upstream returned invalid response"
