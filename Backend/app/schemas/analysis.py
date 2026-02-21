from __future__ import annotations

from pydantic import BaseModel, Field


class VectorizeRequest(BaseModel):
    text: str = Field(min_length=1, description="解析対象テキスト")
    include_pos: list[str] | None = Field(
        default=None,
        description="ベクトル化対象に含める品詞。未指定時は名詞・動詞などの既定値を使用",
    )
    exclude_pos: list[str] | None = Field(
        default=None,
        description="ベクトル化対象から除外する品詞。未指定時は接続詞・助詞などを除外",
    )
    min_length: int = Field(default=1, ge=1, le=64, description="語長の最小値")
    deduplicate: bool = Field(default=False, description="同一基本形を1件に集約するか")


class VectorizedToken(BaseModel):
    surface: str
    base_form: str
    pos: str
    start: int
    end: int
    vector: list[float]
    vector_dim: int
    vector_source: str


class VectorizeMeta(BaseModel):
    model: str
    vector_dim: int
    input_token_count: int
    output_token_count: int
    vector_source_counts: dict[str, int] = Field(default_factory=dict)


class VectorizeResponse(BaseModel):
    text: str
    meta: VectorizeMeta
    tokens: list[VectorizedToken]
