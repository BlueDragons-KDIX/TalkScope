from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class DictionaryLookupRequest(BaseModel):
    term: str = Field(
        min_length=1,
        max_length=128,
        description="検索したい用語",
        examples=["RAG"],
    )
    context: str | None = Field(
        default=None,
        max_length=1000,
        description="会話文脈や補足情報。空文字は未指定として扱う",
        examples=["LLMの会話で出てきた用語"],
    )

    @field_validator("term", mode="before")
    @classmethod
    def normalize_term(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("context", mode="before")
    @classmethod
    def normalize_context(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class DictionaryLookupResponse(BaseModel):
    term: str = Field(description="正規化後の検索語", examples=["RAG"])
    summary: str = Field(
        description="用語の日本語概要（1〜2文）",
        examples=["RAGは、回答時に外部情報を検索して根拠を補う手法です。"],
    )
    source: str = Field(description='回答ソース（固定: "gemini"）', examples=["gemini"])
    model: str = Field(description="使用したGeminiモデル名", examples=["gemini-1.5-flash"])
    cached: bool = Field(description="キャッシュ利用有無（現時点は常にfalse）", examples=[False])
