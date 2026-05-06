import fastapi
import pytest

import app.services.llm.gemini as gemini_service


def test_generate_senses_returns_json_object(monkeypatch) -> None:
    monkeypatch.setattr(
        gemini_service,
        "_call_gemini",
        lambda _prompt: '{"RAG": ["外部情報を参照して回答を補う手法"]}',
    )

    result = gemini_service.generate_senses("RAGの意味を生成して")

    assert result == {"RAG": ["外部情報を参照して回答を補う手法"]}


def test_generate_senses_rejects_blank_prompt() -> None:
    with pytest.raises(fastapi.HTTPException) as exc_info:
        gemini_service.generate_senses("   ")

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "prompt must not be blank"


def test_call_gemini_rejects_missing_api_key(monkeypatch) -> None:
    monkeypatch.setattr(gemini_service, "GEMINI_API_KEY", None)

    with pytest.raises(fastapi.HTTPException) as exc_info:
        gemini_service._call_gemini("test prompt")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "GEMINI_API_KEY is not configured"


def test_parse_json_response_rejects_non_object_json() -> None:
    with pytest.raises(fastapi.HTTPException) as exc_info:
        gemini_service._parse_json_response('["意味1"]')

    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == "Gemini upstream returned invalid JSON"
