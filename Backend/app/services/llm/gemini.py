# <<<< Author: Codex (TODO: 未添削) >>>>>

from __future__ import annotations

import json
import os
from typing import Any

import fastapi
import httpx

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "10"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# ---------------------------------------------------------------------------
# 公開関数
# ---------------------------------------------------------------------------
async def generate_term_senses(prompt: str) -> dict[str, list[str]]:
    """Geminiを呼び出して、用語ごとの意味候補JSONを返す。

    この関数は「LLM呼び出しの薄い入口」として使う。
    後でmodels層に詰め替える前提なので、この段階ではPydanticなどの
    厳密な構造化までは行わず、Geminiが返したJSONオブジェクトをdictで返す。

    処理フロー:
      1. promptの前後空白を削り、空入力を弾く
      2. Gemini REST APIへpromptを送信する
      3. Gemini応答から本文テキストを抽出する
      4. 本文テキストをJSONとしてparseし、dictで返す

    想定する戻り値:
      {
          "単語": ["意味1", "意味2", "意味3"]
      }
    """
    normalized_prompt = prompt.strip()
    if not normalized_prompt:
        raise fastapi.HTTPException(status_code=422, detail="prompt must not be blank")

    async with httpx.AsyncClient() as client:
        response_text = await _call_gemini_async(normalized_prompt, client)
    return _parse_json_response(response_text)


# ---------------------------------------------------------------------------
# Gemini呼び出し
# ---------------------------------------------------------------------------
async def _call_gemini_async(prompt: str, client: httpx.AsyncClient) -> str:
    """Gemini REST APIを非同期で呼び出し、応答本文テキストだけを返す。

    services.dictionary の _call_gemini と同じ方針で、
    設定不足・タイムアウト・上流エラーを FastAPI の HTTPException に変換する。
    """
    # APIキー未設定の場合は、外部通信を始める前に明示的に失敗させる。
    if not GEMINI_API_KEY:
        raise fastapi.HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    # Gemini generateContent のURLとpayloadを組み立てる。
    # responseMimeTypeでJSON返却を促すが、最終的なJSON検証は_parse_json_responseで行う。
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
            "responseMimeType": "application/json",
        },
    }

    # httpxの例外を、API利用側が扱いやすいHTTPステータスへ変換する。
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
        raise fastapi.HTTPException(
            status_code=502,
            detail=f"Gemini API returned {exc.response.status_code}: {exc.response.text}",
        ) from exc
    except httpx.HTTPError as exc:
        raise fastapi.HTTPException(status_code=502, detail=f"Failed to call Gemini API: {exc}") from exc
    except ValueError as exc:
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid response",
        ) from exc

    return _extract_text(payload_json)


# ---------------------------------------------------------------------------
# Gemini応答の取り出し・JSON化
# ---------------------------------------------------------------------------
def _extract_text(payload_json: dict[str, Any]) -> str:
    """Gemini応答から最初の非空テキストを取り出す。

    GeminiのgenerateContentは candidates[0].content.parts に本文候補を返す。
    ここでは最小実装として、最初に見つかった空でない text を採用する。
    """
    try:
        parts = payload_json["candidates"][0]["content"]["parts"]
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

        normalized_text = text.strip()
        if normalized_text:
            return normalized_text

    raise fastapi.HTTPException(
        status_code=502,
        detail="Gemini upstream returned invalid response",
    )


def _parse_json_response(response_text: str) -> dict[str, list[str]]:
    """Geminiが返したJSON文字列を意味候補dictに変換する。

    想定形式:
      {
          "単語": ["意味1", "意味2", "意味3"],
            ...
      }
    """
    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid JSON",
        ) from exc

    if not isinstance(parsed, dict):
        raise fastapi.HTTPException(
            status_code=502,
            detail="Gemini upstream returned invalid JSON",
        )
    # print(f"DEBUG: Parsed Gemini JSON: {parsed}")

    result: dict[str, list[str]] = {}
    for term, senses in parsed.items():
        if not isinstance(term, str) or not isinstance(senses, list):
            raise fastapi.HTTPException(
                status_code=502,
                detail="Gemini upstream returned invalid JSON",
            )

        normalized_senses: list[str] = []
        for sense in senses:
            if not isinstance(sense, str):
                raise fastapi.HTTPException(
                    status_code=502,
                    detail="Gemini upstream returned invalid JSON",
                )
            normalized_senses.append(sense)

        result[term] = normalized_senses

    return result
