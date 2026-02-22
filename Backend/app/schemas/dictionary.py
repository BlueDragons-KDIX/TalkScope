from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


# 辞書検索リクエスト。
# term(単体)かterms(複数)のどちらか一方を受け付ける。
class DictionaryLookupRequest(BaseModel):
    term: str | None = Field(
        default=None,
        description="検索したい用語（単体検索時に指定）",
        examples=["RAG"],
    )
    terms: list[str] | None = Field(
        default=None,
        max_length=20,
        description="検索したい用語の配列（複数検索時に指定）",
        examples=[["RAG", "MCP"]],
    )
    context: str | None = Field(
        default=None,
        max_length=1000,
        description="会話文脈や補足情報。空文字は未指定として扱う",
        examples=["LLMの会話で出てきた用語"],
    )

    @model_validator(mode="after")
    def normalize_and_validate(self) -> "DictionaryLookupRequest":
        # 受け取った文字列を正規化する（前後空白を除去）。
        normalized_term = self.term.strip() if isinstance(self.term, str) else None
        normalized_terms: list[str] | None = None
        if self.terms is not None:
            normalized_terms = [term.strip() if isinstance(term, str) else term for term in self.terms]
            if len(normalized_terms) == 0:
                normalized_terms = None

        normalized_context = self.context.strip() if isinstance(self.context, str) else self.context

        # term/terms の指定ルールを検証する。
        has_single = bool(normalized_term)
        has_multi = bool(normalized_terms)
        if has_single and has_multi:
            raise ValueError("Specify either term or terms, not both")
        if not has_single and not has_multi:
            raise ValueError("Either term or terms is required")

        # 文字数・空文字の制約を検証する。
        if normalized_term is not None and len(normalized_term) > 128:
            raise ValueError("term must be at most 128 characters")
        if normalized_terms is not None:
            for term in normalized_terms:
                if not isinstance(term, str) or not term:
                    raise ValueError("terms must not include empty strings")
                if len(term) > 128:
                    raise ValueError("each term in terms must be at most 128 characters")

        # 正規化済みの値をモデルに反映する。
        self.term = normalized_term
        self.terms = normalized_terms
        self.context = normalized_context or None
        return self


# 単語1件分の辞書検索レスポンス。
class DictionaryLookupResponse(BaseModel):
    term: str = Field(description="正規化後の検索語", examples=["RAG"])
    summary: str = Field(
        description="用語の日本語概要（1〜2文）",
        examples=["RAGは、回答時に外部情報を検索して根拠を補う手法です。"],
    )
    source: str = Field(description='回答ソース（固定: "gemini"）', examples=["gemini"])
    model: str = Field(description="使用したGeminiモデル名", examples=["gemini-1.5-flash"])
    cached: bool = Field(description="キャッシュ利用有無（現時点は常にfalse）", examples=[False])


# 複数単語検索時のレスポンス。
class DictionaryLookupBatchResponse(BaseModel):
    results: list[DictionaryLookupResponse] = Field(
        default_factory=list,
        description="複数用語の検索結果",
    )


class DictionaryEntryResponse(BaseModel):
    id: int = Field(description="辞書エントリID")
    term: str = Field(description="用語")
    description: str = Field(description="説明文")
    meaning_vector: list[float] | None = Field(
        default=None,
        description="意味ベクトル",
    )
    created_at: datetime = Field(description="作成日時(UTC)")
    updated_at: datetime = Field(description="更新日時(UTC)")


class DictionaryEntryListResponse(BaseModel):
    items: list[DictionaryEntryResponse] = Field(
        default_factory=list,
        description="辞書エントリ一覧",
    )
    total: int = Field(description="検索条件に一致した総件数")
    limit: int = Field(description="取得件数上限")
    offset: int = Field(description="取得開始オフセット")


class DictionaryEntryUpdateRequest(BaseModel):
    term: str | None = Field(
        default=None,
        description="更新後の用語",
        max_length=128,
    )
    description: str | None = Field(
        default=None,
        description="更新後の説明文",
        max_length=2000,
    )

    @model_validator(mode="after")
    def normalize_and_validate(self) -> "DictionaryEntryUpdateRequest":
        normalized_term = self.term.strip() if isinstance(self.term, str) else None
        normalized_description = (
            self.description.strip() if isinstance(self.description, str) else None
        )

        has_term = bool(normalized_term)
        has_description = bool(normalized_description)
        if not has_term and not has_description:
            raise ValueError("Either term or description is required")

        self.term = normalized_term if has_term else None
        self.description = normalized_description if has_description else None
        return self


class DictionaryBulkRegisterRequest(BaseModel):
    raw_terms: str = Field(
        min_length=1,
        max_length=5000,
        description="カンマまたは空白区切りの用語文字列",
        examples=["RAG MCP,VectorDB"],
    )

    @model_validator(mode="after")
    def validate_not_blank(self) -> "DictionaryBulkRegisterRequest":
        if not self.raw_terms.strip():
            raise ValueError("raw_terms must not be blank")
        return self


class DictionaryBulkRegisterSkipped(BaseModel):
    term: str = Field(description="スキップした用語")
    reason: str = Field(description="スキップ理由")


class DictionaryBulkRegisterResult(BaseModel):
    term: str = Field(description="登録対象の用語")
    status: Literal["created", "skipped"] = Field(
        description="登録結果ステータス"
    )
    entry: DictionaryEntryResponse | None = Field(
        default=None,
        description="登録されたエントリ。status=created のときのみ設定",
    )
    skipped: DictionaryBulkRegisterSkipped | None = Field(
        default=None,
        description="スキップ情報。status=skipped のときのみ設定",
    )


class DictionaryBulkRegisterResponse(BaseModel):
    requested_count: int = Field(description="入力から解釈された用語数（重複除外後）")
    created_count: int = Field(description="新規登録件数")
    skipped_count: int = Field(description="スキップ件数")
    results: list[DictionaryBulkRegisterResult] = Field(
        default_factory=list,
        description="用語ごとの処理結果",
    )
