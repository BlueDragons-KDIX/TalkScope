from __future__ import annotations

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
