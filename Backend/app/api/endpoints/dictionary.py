from __future__ import annotations

import fastapi

from app.schemas.dictionary import DictionaryLookupRequest, DictionaryLookupResponse
from app.services.dictionary import lookup_term_summary

router = fastapi.APIRouter()


@router.post(
    "/lookup",
    response_model=DictionaryLookupResponse,
    summary="用語の意味概要を取得する",
    description="現時点ではGeminiを利用して、入力用語の日本語概要（1〜2文）を返します。",
)
def lookup(
    body: DictionaryLookupRequest,
) -> DictionaryLookupResponse:
    result = lookup_term_summary(term=body.term, context=body.context)
    return DictionaryLookupResponse(**result)
