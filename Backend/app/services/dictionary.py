from __future__ import annotations

import os
from typing import Any

import fastapi
import httpx

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "10"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def lookup_term_summary(term: str, context: str | None = None) -> dict[str, Any]:
    normalized_term = term.strip()

    db_result = _lookup_term_from_db(normalized_term)
    if db_result is not None:
        return db_result

    prompt = _build_prompt(normalized_term, context)
    summary, model_name = _call_gemini(prompt)
    return {
        "term": normalized_term,
        "summary": summary,
        "source": "gemini",
        "model": model_name,
        "cached": False,
    }


def _lookup_term_from_db(term: str) -> dict[str, Any] | None:
    _ = term
    return None


def _build_prompt(term: str, context: str | None) -> str:
    normalized_context = (context or "").strip() or "なし"
    return (
        "あなたは辞書アシスタントです。\n"
        "次の用語を、会話中にすぐ理解できるように日本語で1〜2文で説明してください。\n"
        "専門用語の言い換えを優先し、簡潔に答えてください。\n"
        f"用語: {term}\n"
        f"文脈: {normalized_context}"
    )


def _call_gemini(prompt: str) -> tuple[str, str]:
    if not GEMINI_API_KEY:
        raise fastapi.HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    url = f"{GEMINI_API_BASE}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 120,
            "topP": 0.9,
        },
    }

    try:
        response = httpx.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload_json = response.json()
    except httpx.TimeoutException as exc:
        raise fastapi.HTTPException(status_code=504, detail="Gemini API request timed out") from exc
    except httpx.HTTPError as exc:
        raise fastapi.HTTPException(status_code=502, detail="Failed to call Gemini API") from exc
    except ValueError as exc:
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid response",
        ) from exc

    try:
        candidates = payload_json["candidates"]
        candidate = candidates[0]
        parts = candidate["content"]["parts"]
    except (TypeError, KeyError, IndexError) as exc:
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid response",
        ) from exc

    for part in parts:
        if not isinstance(part, dict):
            continue
        text = part.get("text")
        if not isinstance(text, str):
            continue
        normalized_text = text.replace("\n", " ").strip()
        if normalized_text:
            return normalized_text, GEMINI_MODEL

    raise fastapi.HTTPException(
        status_code=502,
        detail="Gemini upstream returned invalid response",
    )
