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
    compute_term_scores_for_request,
    reset_session_theme,
)

router = fastapi.APIRouter()


@router.post(
    "/theme/chunk",
    response_model=ThemeChunkResponse,
    summary="テーマベクトルを1チャンク分 EMA 更新する",
)
def post_theme_chunk(body: ThemeChunkRequest) -> ThemeChunkResponse:
    return apply_theme_chunk(body)


@router.post(
    "/theme/session/reset",
    response_model=SessionResetResponse,
    summary="セッションのテーマベクトルを破棄する",
)
def post_theme_session_reset(body: SessionResetRequest) -> SessionResetResponse:
    cleared = reset_session_theme(body.session_id)
    return SessionResetResponse(session_id=body.session_id, cleared=cleared)


@router.post(
    "/score/terms",
    response_model=TermScoreBatchResponse,
    summary="複数用語の素点＋バフを一括算出する（IDF は未搭載時スキップ）",
)
def post_score_terms(body: TermScoreBatchRequest) -> TermScoreBatchResponse:
    return compute_term_scores_for_request(
        body.session_id,
        body.chunk_text_for_bigrams,
        body.terms,
        theme_vector_override=body.theme_vector_override,
        use_session_theme=body.use_session_theme,
        weights=body.weights,
        debuffs=body.debuffs,
    )
