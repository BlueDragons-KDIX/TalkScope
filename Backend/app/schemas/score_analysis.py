"""用語スコア・テーマ EMA の API スキーマ。

IDF 実データの加工・保存・配線は ``Backend/docs/IDF_DATA_PIPELINE.md`` を参照。
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# テーマ EMA の α（未指定時）。例レンジ 0.05〜0.15 のうちチューニング前の単一既定。
THEME_EMA_ALPHA_DEFAULT: float = 0.10


class ThemeChunkRequest(BaseModel):
    """テーマ EMA の係数・正規化・スキップ下限はサーバ固定（``THEME_EMA_ALPHA_DEFAULT`` 等）。"""

    session_id: str = Field(min_length=1, description="クライアントが発行するセッション識別子")
    text: str = Field(min_length=1, description="音声チャンク等のテキスト")


class ThemeChunkResponse(BaseModel):
    theme_vector: list[float] = Field(description="更新後または従前のテーマベクトル")
    updated: bool
    diagnostics: dict[str, object] = Field(default_factory=dict, description="スキップ理由などデバッグ用")


class SessionResetRequest(BaseModel):
    session_id: str = Field(min_length=1)


class SessionResetResponse(BaseModel):
    session_id: str
    cleared: bool


class TermScoreInput(BaseModel):
    lemma: str = Field(min_length=1, description="基本形（IDF と揃える想定）")
    occurrence_count: int | None = Field(
        default=None,
        ge=0,
        description="会話内出現回数。省略時は素点（base）の計算をスキップし base=0",
    )
    term_vector: list[float] = Field(description="用語ベクトル（テーマ次元と同一であること）")


class TermScoreBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str = Field(min_length=1)
    terms: list[TermScoreInput] = Field(min_length=1)


class TermScoreResult(BaseModel):
    lemma: str
    base: float
    buffs: dict[str, float]
    final: float


class TermScoreBatchResponse(BaseModel):
    results: list[TermScoreResult]
    theme_vector_used: list[float] | None = Field(
        description="実際にテーマ類似に使ったベクトル。無ければ null"
    )
