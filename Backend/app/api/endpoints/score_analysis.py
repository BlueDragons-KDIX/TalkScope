"""用語スコア・テーマ EMA を HTTP で公開する薄いレイヤ。

ドメインロジックは ``app.services.term_score``。IDF は起動時に ``idf_runtime`` が DB／JSON を読んでおき、
本モジュールのハンドラは DB に直接クエリしない。
"""

import fastapi

from app.schemas.score_analysis import (
    SessionResetRequest,
    SessionResetResponse,
    TermScoreBatchRequest,
    TermScoreBatchResponse,
    ThemeChunkRequest,
    ThemeChunkResponse,
)
from app.services.term_score import (
    apply_theme_chunk,
    clear_theme,
    compute_term_scores_for_request,
)

router = fastapi.APIRouter()


@router.post(
    "/theme/chunk",
    response_model=ThemeChunkResponse,
    summary="テーマベクトルを1チャンク分 EMA 更新する",
)
def post_theme_chunk(body: ThemeChunkRequest) -> ThemeChunkResponse:
    """音声チャンク等 1 件を受け取り、そのセッションのテーマ EMA を更新して返す。検証済みボディのみ渡す。"""
    return apply_theme_chunk(body)


@router.post(
    "/theme/session/reset",
    response_model=SessionResetResponse,
    summary="セッションのテーマベクトルを破棄する",
)
def post_theme_session_reset(body: SessionResetRequest) -> SessionResetResponse:
    """インメモリのテーマを当該 ``session_id`` だけ削除し、削除できたかを返す。"""
    cleared = clear_theme(body.session_id)
    return SessionResetResponse(session_id=body.session_id, cleared=cleared)


@router.post(
    "/score/terms",
    response_model=TermScoreBatchResponse,
    summary="複数用語の素点＋バフを一括算出する（IDF は term_idf／IDF_JSON_PATH を起動時ロード済みのときのみ有効）",
)
def post_score_terms(body: TermScoreBatchRequest) -> TermScoreBatchResponse:
    """複数語のスコアを一括算出し、``term_score`` に委譲する。"""
    return compute_term_scores_for_request(body.session_id, body.terms)
