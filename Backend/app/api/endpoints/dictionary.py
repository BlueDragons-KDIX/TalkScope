from __future__ import annotations

import fastapi

from app.schemas.dictionary import (
    DictionaryLookupBatchResponse,
    DictionaryLookupRequest,
    DictionaryLookupResponse,
)
from app.services.dictionary import lookup_term_summary, lookup_terms_summaries

router = fastapi.APIRouter()


# 辞書検索API本体。
# term(単体)とterms(複数)のどちらでも受け付ける。
@router.post(
    "/lookup",
    response_model=DictionaryLookupResponse | DictionaryLookupBatchResponse,
    summary="用語の意味概要を取得する",
    description=(
        "現時点ではGeminiを利用して、入力用語の日本語概要（1〜2文）を返します。"
        " term で単体、terms で複数同時検索に対応します。"
        " 複数時は単語ごとに非同期並列で問い合わせます。"
    ),
)
def lookup(
    body: DictionaryLookupRequest,
) -> DictionaryLookupResponse | DictionaryLookupBatchResponse:
    # 複数検索時はサービス層で並列処理し、results配列で返す。
    if body.terms is not None:
        results = lookup_terms_summaries(terms=body.terms, context=body.context)
        return DictionaryLookupBatchResponse(
            results=[DictionaryLookupResponse(**result) for result in results]
        )

    # 単体検索時は従来フォーマットのレスポンスを返す。
    result = lookup_term_summary(term=body.term or "", context=body.context)
    return DictionaryLookupResponse(**result)
