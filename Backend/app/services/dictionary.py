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


# 単語1件の概要を取得する。
# 先にDBを参照し、未ヒット時のみGeminiへフォールバックする。
def lookup_term_summary(term: str, context: str | None = None) -> dict[str, Any]:
    # 入力揺れを減らすため前後空白を除去する。
    normalized_term = term.strip()

    # 将来の辞書DB接続を想定した優先参照ポイント。
    # db_result = _lookup_term_from_db(normalized_term)
    # if db_result is not None:
    #     return db_result

    # DB未ヒット時はプロンプトを作ってGeminiを呼ぶ。
    prompt = _build_prompt(normalized_term, context)
    summary, model_name = _call_gemini(prompt)
    return _build_lookup_result(normalized_term, summary, model_name)


# 複数単語の概要をまとめて取得する。
# 同期APIから呼びやすいよう、内部の非同期処理をここで実行する。
def lookup_terms_summaries(terms: list[str], context: str | None = None) -> list[dict[str, Any]]:
    # 各単語の正規化（空白除去）。
    normalized_terms = [term.strip() for term in terms]
    if not normalized_terms:
        return []

    return asyncio.run(_lookup_terms_individually_async(normalized_terms, context))


# DB問い合わせの差し込みポイント。
# 現状は未実装のため常にNoneを返す。
def _lookup_term_from_db(term: str) -> dict[str, Any] | None:
    _ = term
    return None


# Geminiへ渡す単語説明用プロンプトを組み立てる。
def _build_prompt(term: str, context: str | None) -> str:
    normalized_context = (context or "").strip() or "なし"
    return (
        "あなたは辞書アシスタントです。\n"
        "次の用語を、会話中にすぐ理解できるように日本語で1〜2文で説明してください。\n"
        "専門用語の言い換えを優先し、簡潔に答えてください。\n"
        f"用語: {term}\n"
        f"文脈: {normalized_context}"
    )


# APIレスポンス用の共通フォーマットを作る。
def _build_lookup_result(term: str, summary: str, model_name: str) -> dict[str, Any]:
    return {
        "term": term,
        "summary": summary,
        "source": "gemini",
        "model": model_name,
        "cached": False,
    }


# 複数単語を非同期並列で問い合わせる。
# 重複単語は1回だけ呼び出し、返却時に元の入力順へ復元する。
async def _lookup_terms_individually_async(
    terms: list[str],
    context: str | None,
) -> list[dict[str, Any]]:
    # API呼び出し回数を抑えるため重複を除去する。
    unique_terms = list(dict.fromkeys(terms))
    if not unique_terms:
        return []

    # 上流への過負荷を避けるため同時実行数を制限する。
    semaphore = asyncio.Semaphore(max(1, GEMINI_PARALLELISM))
    async with httpx.AsyncClient() as client:
        async def _worker(term: str) -> dict[str, Any]:
            async with semaphore:
                return await _lookup_term_summary_async(term=term, context=context, client=client)

        # 各単語の問い合わせを同時に実行する。
        unique_results = await asyncio.gather(*(_worker(term) for term in unique_terms))

    # 入力順を保つため、ユニーク結果から並べ直して返す。
    by_term = {item["term"]: item for item in unique_results}
    return [by_term[term].copy() for term in terms]


# 非同期経路で単語1件の概要を取得する。
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


# Gemini REST APIを同期で呼び出し、要約文とモデル名を返す。
def _call_gemini(prompt: str) -> tuple[str, str]:
    # 設定不足は上流呼び出し前に明示的に失敗させる。
    if not GEMINI_API_KEY:
        raise fastapi.HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    # Gemini generateContent のリクエストを組み立てる。
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
            "topP": 0.9,
        },
    }

    # ネットワーク/上流エラーをAPI仕様のHTTPステータスへ変換する。
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
        raise fastapi.HTTPException(status_code=504, detail=f"Gemini API request timed out: {exc}") from exc
    except httpx.HTTPStatusError as exc:
        raise fastapi.HTTPException(status_code=502, detail=f"Gemini API returned {exc.response.status_code}: {exc.response.text}") from exc
    except httpx.HTTPError as exc:
        raise fastapi.HTTPException(status_code=502, detail=f"Failed to call Gemini API: {exc}") from exc
    except ValueError as exc:
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid response",
        ) from exc

    return _extract_summary_text(payload_json), GEMINI_MODEL


# Gemini REST APIを非同期で呼び出し、要約文とモデル名を返す。
async def _call_gemini_async(
    prompt: str,
    client: httpx.AsyncClient,
) -> tuple[str, str]:
    # 設定不足は上流呼び出し前に明示的に失敗させる。
    if not GEMINI_API_KEY:
        raise fastapi.HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    # Gemini generateContent のリクエストを組み立てる。
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
            "topP": 0.9,
        },
    }

    # ネットワーク/上流エラーをAPI仕様のHTTPステータスへ変換する。
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
        raise fastapi.HTTPException(status_code=504, detail=f"Gemini API request timed out: {exc}") from exc
    except httpx.HTTPStatusError as exc:
        raise fastapi.HTTPException(status_code=502, detail=f"Gemini API returned {exc.response.status_code}: {exc.response.text}") from exc
    except httpx.HTTPError as exc:
        raise fastapi.HTTPException(status_code=502, detail=f"Failed to call Gemini API: {exc}") from exc
    except ValueError as exc:
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid response",
        ) from exc

    return _extract_summary_text(payload_json), GEMINI_MODEL


# Gemini応答から本文テキストを抽出し、空行・改行を正規化する。
# 想定スキーマを満たさない場合は不正応答として502に変換する。
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

    # parts配列の先頭から、最初の非空テキストを採用する。
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
