from __future__ import annotations

import re

import fastapi
from sqlalchemy.exc import IntegrityError

from app.core.database import db
from app.crud.dictionary import (
    create_dictionary,
    delete_dictionary,
    list_dictionaries,
    read_dictionary_by_id,
    read_dictionary_by_term,
    update_dictionary,
)
from app.schemas.dictionary import (
    DictionaryBulkRegisterRequest,
    DictionaryBulkRegisterResponse,
    DictionaryBulkRegisterResult,
    DictionaryBulkRegisterSkipped,
    DictionaryEntryListResponse,
    DictionaryEntryResponse,
    DictionaryEntryUpdateRequest,
    DictionaryLookupBatchResponse,
    DictionaryLookupRequest,
    DictionaryLookupResponse,
)
from app.services.dictionary import lookup_term_summary, lookup_terms_summaries
from app.services.text_analysis import vectorize_pretokenized_words

router = fastapi.APIRouter()
_TERM_SPLIT_RE = re.compile(r"[,\s、，]+")


def _ensure_db_available() -> None:
    if not db.is_available:
        raise fastapi.HTTPException(
            status_code=503,
            detail="DATABASE_URL is not configured",
        )


def _to_entry_response(entry) -> DictionaryEntryResponse:
    return DictionaryEntryResponse(
        id=entry.id,
        term=entry.term,
        description=entry.description,
        meaning_vector=entry.meaning_vector,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def _parse_raw_terms(raw_terms: str) -> list[str]:
    terms = [term.strip() for term in _TERM_SPLIT_RE.split(raw_terms) if term.strip()]
    unique_terms = list(dict.fromkeys(terms))
    for term in unique_terms:
        if len(term) > 128:
            raise fastapi.HTTPException(
                status_code=422,
                detail="each term must be at most 128 characters",
            )
    return unique_terms


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


@router.get(
    "/entries",
    response_model=DictionaryEntryListResponse,
    summary="辞書エントリ一覧を取得する",
)
def list_entries(
    q: str | None = fastapi.Query(default=None, description="用語の部分一致検索"),
    limit: int = fastapi.Query(default=100, ge=1, le=200),
    offset: int = fastapi.Query(default=0, ge=0),
) -> DictionaryEntryListResponse:
    _ensure_db_available()
    normalized_q = q.strip() if isinstance(q, str) and q.strip() else None
    rows, total = list_dictionaries(term_query=normalized_q, limit=limit, offset=offset)
    return DictionaryEntryListResponse(
        items=[_to_entry_response(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch(
    "/entries/{entry_id}",
    response_model=DictionaryEntryResponse,
    summary="辞書エントリを更新する",
)
def patch_entry(
    entry_id: int,
    body: DictionaryEntryUpdateRequest,
) -> DictionaryEntryResponse:
    _ensure_db_available()
    current = read_dictionary_by_id(entry_id)
    if current is None:
        raise fastapi.HTTPException(status_code=404, detail="entry not found")

    meaning_vector: list[float] | None = None
    if body.term is not None and body.term != current.term:
        duplicate = read_dictionary_by_term(body.term)
        if duplicate is not None and duplicate.id != entry_id:
            raise fastapi.HTTPException(
                status_code=409,
                detail="term already exists",
            )
        vectors = vectorize_pretokenized_words([(body.term,)])
        meaning_vector = vectors[0] if vectors else []

    updated = update_dictionary(
        id=entry_id,
        term=body.term,
        description=body.description,
        meaning_vector=meaning_vector,
    )
    if updated is None:
        raise fastapi.HTTPException(status_code=404, detail="entry not found")
    return _to_entry_response(updated)


@router.delete(
    "/entries/{entry_id}",
    status_code=204,
    summary="辞書エントリを削除する",
)
def remove_entry(entry_id: int) -> fastapi.Response:
    _ensure_db_available()
    deleted = delete_dictionary(entry_id)
    if not deleted:
        raise fastapi.HTTPException(status_code=404, detail="entry not found")
    return fastapi.Response(status_code=204)


@router.post(
    "/entries/bulk",
    response_model=DictionaryBulkRegisterResponse,
    summary="用語を一括登録する",
    description=(
        "カンマまたは空白区切りの用語を受け取り、"
        "Gemini で説明文を生成して辞書DBに登録します。"
    ),
)
def bulk_register(
    body: DictionaryBulkRegisterRequest,
) -> DictionaryBulkRegisterResponse:
    _ensure_db_available()
    terms = _parse_raw_terms(body.raw_terms)
    if not terms:
        raise fastapi.HTTPException(status_code=422, detail="no terms found")

    results: list[DictionaryBulkRegisterResult] = []
    created_count = 0
    skipped_count = 0

    for term in terms:
        existing = read_dictionary_by_term(term)
        if existing is not None:
            skipped_count += 1
            results.append(
                DictionaryBulkRegisterResult(
                    term=term,
                    status="skipped",
                    skipped=DictionaryBulkRegisterSkipped(
                        term=term,
                        reason="already exists",
                    ),
                )
            )
            continue

        try:
            llm_result = lookup_term_summary(term=term)
        except fastapi.HTTPException as exc:
            skipped_count += 1
            results.append(
                DictionaryBulkRegisterResult(
                    term=term,
                    status="skipped",
                    skipped=DictionaryBulkRegisterSkipped(
                        term=term,
                        reason=f"lookup failed ({exc.status_code})",
                    ),
                )
            )
            continue

        vectors = vectorize_pretokenized_words([(term,)])
        meaning_vector = vectors[0] if vectors else []

        try:
            entry_id = create_dictionary(
                term=term,
                description=llm_result["summary"],
                meaning_vector=meaning_vector,
            )
            created_entry = read_dictionary_by_id(entry_id)
            if created_entry is None:
                raise fastapi.HTTPException(
                    status_code=500,
                    detail="failed to load created entry",
                )
            created_count += 1
            results.append(
                DictionaryBulkRegisterResult(
                    term=term,
                    status="created",
                    entry=_to_entry_response(created_entry),
                )
            )
        except IntegrityError:
            # 並列処理などで同時に同一語が作成された場合はスキップ扱いにする。
            skipped_count += 1
            results.append(
                DictionaryBulkRegisterResult(
                    term=term,
                    status="skipped",
                    skipped=DictionaryBulkRegisterSkipped(
                        term=term,
                        reason="already exists",
                    ),
                )
            )

    return DictionaryBulkRegisterResponse(
        requested_count=len(terms),
        created_count=created_count,
        skipped_count=skipped_count,
        results=results,
    )
