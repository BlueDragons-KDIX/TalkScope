from __future__ import annotations

import asyncio
import os
from typing import Any

import fastapi
import httpx

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "10"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_PARALLELISM = int(os.getenv("GEMINI_PARALLELISM", "5"))


def lookup_term_summary(term: str, context: str | None = None) -> dict[str, Any]:
    normalized_term = term.strip()

    db_result = _lookup_term_from_db(normalized_term)
    if db_result is not None:
        return db_result

    prompt = _build_prompt(normalized_term, context)
    summary, model_name = _call_gemini(prompt)
    return _build_lookup_result(normalized_term, summary, model_name)


def lookup_terms_summaries(terms: list[str], context: str | None = None) -> list[dict[str, Any]]:
    normalized_terms = [term.strip() for term in terms]
    if not normalized_terms:
        return []

    return asyncio.run(_lookup_terms_individually_async(normalized_terms, context))


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


def _build_lookup_result(term: str, summary: str, model_name: str) -> dict[str, Any]:
    return {
        "term": term,
        "summary": summary,
        "source": "gemini",
        "model": model_name,
        "cached": False,
    }


async def _lookup_terms_individually_async(
    terms: list[str],
    context: str | None,
) -> list[dict[str, Any]]:
    unique_terms = list(dict.fromkeys(terms))
    if not unique_terms:
        return []

    semaphore = asyncio.Semaphore(max(1, GEMINI_PARALLELISM))
    async with httpx.AsyncClient() as client:
        async def _worker(term: str) -> dict[str, Any]:
            async with semaphore:
                return await _lookup_term_summary_async(term=term, context=context, client=client)

        unique_results = await asyncio.gather(*(_worker(term) for term in unique_terms))

    by_term = {item["term"]: item for item in unique_results}
    return [by_term[term].copy() for term in terms]


async def _lookup_term_summary_async(
    term: str,
    context: str | None,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    normalized_term = term.strip()
    db_result = _lookup_term_from_db(normalized_term)
    if db_result is not None:
        return db_result

    prompt = _build_prompt(normalized_term, context)
    summary, model_name = await _call_gemini_async(prompt, client=client)
    return _build_lookup_result(normalized_term, summary, model_name)


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

    return _extract_summary_text(payload_json), GEMINI_MODEL


async def _call_gemini_async(
    prompt: str,
    client: httpx.AsyncClient,
) -> tuple[str, str]:
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
        response = await client.post(
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

    return _extract_summary_text(payload_json), GEMINI_MODEL


def _extract_summary_text(payload_json: dict[str, Any]) -> str:
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
            return normalized_text

    raise fastapi.HTTPException(
        status_code=502,
        detail="Gemini upstream returned invalid response",
    )
