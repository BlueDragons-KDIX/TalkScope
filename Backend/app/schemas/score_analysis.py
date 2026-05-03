"""用語スコア・テーマ EMA の API スキーマ。

IDF 実データの加工・保存・配線は ``Backend/docs/IDF_DATA_PIPELINE.md`` を参照。
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# テーマ EMA の α（未指定時）。例レンジ 0.05〜0.15 のうちチューニング前の単一既定。
THEME_EMA_ALPHA_DEFAULT: float = 0.10


class ThemeChunkRequest(BaseModel):
    session_id: str = Field(min_length=1, description="クライアントが発行するセッション識別子")
    text: str = Field(min_length=1, description="音声チャンク等のテキスト")
    alpha: float = Field(
        default=THEME_EMA_ALPHA_DEFAULT,
        ge=0.0,
        le=1.0,
        description="EMA 係数。未指定時は本モジュール先頭の THEME_EMA_ALPHA_DEFAULT（例レンジ 0.05〜0.15 内）。",
    )
    normalize_sentence: bool = Field(default=True, description="文章ベクトルの L2 正規化")
    min_content_tokens: int = Field(default=2, ge=1, description="テーマ更新スキップ判定の近似 content 下限")


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
    occurrence_count: int = Field(ge=0)
    term_vector: list[float] = Field(description="用語ベクトル（テーマ次元と同一であること）")


class TermScoreWeights(BaseModel):
    """係数チューニング用オプション。"""

    theme_sim_weight: float = Field(default=0.5, ge=0.0)
    idf_weight: float = Field(default=0.08, ge=0.0, description="IDF 無効時は 0 でよい")
    ppmi_clip: float = Field(default=3.0, ge=0.0)
    ppmi_weight: float = Field(default=0.2, ge=0.0)
    count_cap: int = Field(default=100, ge=1)
    pmi_cooccurrence: Literal["adjacent", "window"] = Field(
        default="adjacent",
        description="PMI 用の共起カウント: adjacent=隣接のみ（既定）, window=窓内（距離は pmi_window_max_distance）",
    )
    pmi_window_max_distance: int = Field(
        default=4,
        ge=1,
        le=64,
        description="pmi_cooccurrence=window のとき、トークン index 差の最大値（1 で隣接のみと同型）",
    )


class TermScoreBatchRequest(BaseModel):
    session_id: str = Field(min_length=1)
    chunk_text_for_bigrams: str = Field(
        description="同一発話内の共起カウント用テキスト（空なら PMI 項はスキップに近い）"
    )
    terms: list[TermScoreInput] = Field(min_length=1)
    theme_vector_override: list[float] | None = Field(
        default=None,
        description="未指定時はセッションに保存済みテーマを使用する",
    )
    use_session_theme: bool = Field(default=True, description="False のときテーマ類似バフは付けない")
    weights: TermScoreWeights = Field(default_factory=TermScoreWeights)
    debuffs: dict[str, float] | None = Field(default=None)


class TermScoreResult(BaseModel):
    lemma: str
    occurrence_count: int
    base: float
    buff_total: float
    debuff_total: float
    buffs: dict[str, float]
    debuffs: dict[str, float]
    final: float


class TermScoreBatchResponse(BaseModel):
    results: list[TermScoreResult]
    theme_vector_used: list[float] | None = Field(
        description="実際にテーマ類似に使ったベクトル。無ければ null"
    )
