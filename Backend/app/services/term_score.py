"""用語スコア・テーマ EMA・インメモリセッション・API 向け応答までを一元化する。

- 形態素は ``text_analysis.morphological_analysis`` / ``vectorize_sentence`` を利用（再実装しない）
- 数式・構造単体は ``score_building_blocks``
- 複数ワーカーではプロセス内セッションは共有されない（本番の共有ストアは別タスクで検討）

設計方針:

- **文ベクトル／重い前処理の回数**: テーマ更新ではチャンクごとに ``vectorize_sentence`` を高々 1 回。
  用語スコアのバッチは語ごとに素点・テーマ類似・IDF のみを計算する（共起 PPMI は提供しない）。
- **multi-sense**: 将来、語あたり複数 sense ベクトルがある場合は ``best_sense_index_by_context`` で
  文脈ベクトルに対する argmax を基本形とする（LLM・初出生成は同期から外す前提で別タスク）。
"""

from __future__ import annotations

from app.schemas.dictionary import TermInfo

__all__ = [
    "THEME_EMA_ENABLED",
    "adjacent_bigrams_for_scoring_text",
    "apply_theme_chunk",
    "clear_all_sessions",
    "clear_theme",
    "compute_term_score_additive",
    "compute_term_scores_for_request",
    "debug_session_count",
    "get_theme",
    "morph_tokens_for_scoring",
    "scoring_lemmas_in_order",
    "set_theme",
    "update_theme_ema_chunk",
]

from threading import Lock
from typing import Any

from app.schemas.score_analysis import (
    THEME_EMA_ALPHA_DEFAULT,
    TermScoreBatchResponse,
    TermScoreInput,
    TermScoreResult,
    ThemeChunkRequest,
    ThemeChunkResponse,
)

from app.services.score_building_blocks import (
    IdfLookupTable,
    adjacent_bigram_counts,
    compose_additive_score,
    cosine_similarity,
    count_axis_weight,
    ema_theme_step,
    is_scored_token_surface,
    is_term_score_pos_allowed,
    linear_cosine_similarity_to_unit,
    should_skip_theme_update,
)
from app.services.idf_runtime import get_idf_table
from app.services.text_analysis import morphological_analysis, vectorize_sentence

# POST /analysis/score/terms の加点の強さ（数を大きくするとその要素の影響が強くなる）
# テーマ類似: 「今の会話の話題」と用語の意味が近いほど足す量 → 応答 buffs["theme_linear"]
_SCORE_THEME_SIM_WEIGHT = 0.5
# レア語（IDF）: Wikipedia 等で珍しい語ほど足す量 → 応答 buffs["idf_scaled"]
_SCORE_IDF_WEIGHT = 0.08
# 出現回数から作る素点の上限 → 応答 base（count_axis_weight の cap）
_SCORE_COUNT_CAP = 100

# チャンクごとのテーマベクトル と score/terms の theme_linear（True にすると有効）
THEME_EMA_ENABLED: bool = False

# POST /analysis/theme/chunk の固定値（API からは変更不可）
_THEME_CHUNK_NORMALIZE_SENTENCE = True
_THEME_CHUNK_MIN_CONTENT_TOKENS = 2

# ── 形態素・ベクトル化への接続（フィルタ） ────────────────────────────


def morph_tokens_for_scoring(text: str) -> list[dict[str, Any]]:
    """スコア計算に必要となる対象となる形態素だけを抽出する。(名詞・固有名詞のみ、代名詞は除外)

    Sudachi/GiNZa 経由の分析結果へ **名詞系・短文除外・代名詞除外**などのフィルタをかけ、
    ``base_form`` を確定させた辞書リストを返す（テーマゲートなどに利用）。
    """
    out: list[dict[str, Any]] = []
    for t in morphological_analysis(text):
        pos = t.get("pos") or ""
        if not is_term_score_pos_allowed(pos):
            continue
        surface = str(t.get("surface", ""))
        if not is_scored_token_surface(surface):
            continue
        bf = str(t.get("base_form") or surface)
        if len(bf) < 2:
            continue
        item = dict(t)
        item["base_form"] = bf
        out.append(item)
    return out


def scoring_lemmas_in_order(text: str) -> list[str]:
    """チャンク内で用語スコア対象となる語順の並びが知りたいときのヘルパー。

    中身は :func:`morph_tokens_for_scoring` を通過したトークンの ``base_form`` のみで、順序は原文に沿う。
    （共起カウント用ヘルパの入力として利用可能だが、`POST .../score/terms` 本体では使わない。）
    """
    return [m["base_form"] for m in morph_tokens_for_scoring(text)]


def adjacent_bigrams_for_scoring_text(text: str) -> dict[tuple[str, str], int]:
    """単一チャンク内での隣接共起カウント（ヘルパー・テスト用。スコア API では不使用）。"""
    lemmas = scoring_lemmas_in_order(text)
    return adjacent_bigram_counts(lemmas, filter_surface=lambda _: True)


def update_theme_ema_chunk(
    text: str,
    theme: list[float] | None,
    alpha: float,
    *,
    normalize_sentence: bool = True,
    min_content_tokens: int = 2,
) -> tuple[list[float] | None, bool, dict[str, Any]]:
    """1チャンクぶんの文章ベクトルをEMAで既存テーマになじませる。(DBは使わない)

    相槌のみ・短文などはゲートで更新をスキップする。Embedding は vectorize_sentence に委ねる。
    戻り値は (テーマベクトル, 書き換えが起きたか, ログ用キー)。
    """
    approx_content = len(morph_tokens_for_scoring(text))
    skip = should_skip_theme_update(text, approx_content, min_content_tokens=min_content_tokens)
    if skip:
        return theme, False, {"skipped": True, "approx_content_tokens": approx_content}

    vec_result = vectorize_sentence(text=text, normalize=normalize_sentence)
    sentence_vector = vec_result.get("sentence_vector") or []
    meta = vec_result.get("meta") or {}
    if not sentence_vector:
        return theme, False, {"skipped": True, "reason": "empty_sentence_vector", "meta": meta}

    v_t = [float(v) for v in sentence_vector]
    new_theme = ema_theme_step(theme, v_t, alpha)
    return new_theme, True, {"meta": meta}


def compute_term_score_additive(
    lemma: str,
    *,
    occurrence_count: int | None = None,
    theme_vector: list[float] | None = None,
    term_vector: list[float] | None = None,
    idf_table: IdfLookupTable | None = None,
    count_cap: int = 100,
    theme_sim_weight: float = 0.5,
    idf_weight: float = 0.08,
) -> dict[str, Any]:
    """
    1用語ぶんの素点と各種バフを足し込み最終値を決める関数。

    ``occurrence_count`` を使うのは **素点（``base``）のみ**（``count_axis_weight``）。
    省略（``None``）のときは素点計算をスキップし ``base=0``。

    - **テーマ類似バフ**（``buffs["theme_linear"]``）: ``term_vector`` とテーマベクトル（``occurrence_count`` 非使用）。
    - **IDF バフ**（``buffs["idf_scaled"]``）: ``lemma`` と IDF テーブル（``occurrence_count`` 非使用）。
    """
    if occurrence_count is None:
        base = 0.0
    else:
        base = count_axis_weight(occurrence_count, cap=count_cap)
    buffs: dict[str, float] = {}

    if (
        theme_vector
        and term_vector
        and len(theme_vector) == len(term_vector)
        and theme_sim_weight != 0.0
    ):
        sim = cosine_similarity(term_vector, theme_vector)
        buffs["theme_linear"] = theme_sim_weight * linear_cosine_similarity_to_unit(sim)

    if idf_table is not None and idf_weight != 0.0:
        buffs["idf_scaled"] = idf_weight * idf_table.lookup(lemma)

    composed = compose_additive_score(base, buffs, floor=0.0)

    return {
        **composed,
        "lemma": lemma,
    }


# ── インメモリ・テーマセッション ───────────────────────────────────────
#
# ``POST .../theme/chunk`` で更新したテーマベクトルを、クライアントが発行する session_id で保持する。
# 単一プロセスのみ有効・複数ワーカー間は共有しない（本番の共有ストアは別タスク）。

_lock = Lock()
_sessions: dict[str, list[float]] = {}


def get_theme(session_id: str) -> list[float] | None:
    """セッションに保存済みのテーマベクトルを返す（未設定なら ``None``）。コピーなのでミュータブル変更はしないこと。

    ``THEME_EMA_ENABLED`` が ``False`` のときは常に ``None``（ストアを読まない）。
    """
    if not THEME_EMA_ENABLED:
        return None
    with _lock:
        v = _sessions.get(session_id)
        return None if v is None else list(v)


def set_theme(session_id: str, vector: list[float]) -> None:
    """チャンク EMA で得たテーマベクトルを ``session_id`` キーで上書き保存する。"""
    with _lock:
        _sessions[session_id] = list(vector)


def clear_theme(session_id: str) -> bool:
    """当該 ``session_id`` のテーマを削除する。削除したら ``True``、元から無ければ ``False``。

    ``POST .../theme/session/reset`` からも直接呼ばれる（リセット専用ラッパは持たない）。
    """
    with _lock:
        if session_id in _sessions:
            del _sessions[session_id]
            return True
        return False


def debug_session_count() -> int:
    """インメモリに保持している **テーマセッション数**（``_sessions`` のキー数）。テスト・監視用途。"""
    with _lock:
        return len(_sessions)


def clear_all_sessions() -> None:
    """テスト用：全セッションを削除する。"""
    with _lock:
        _sessions.clear()


# ── FastAPI ルータから呼ぶ応答の組み立て ────────────────────────────────


def apply_theme_chunk(req: ThemeChunkRequest) -> ThemeChunkResponse:
    """``POST .../theme/chunk`` 用のオーケストレーション更新・インメモリ保存・レスポンス組み立て。"""
    if not THEME_EMA_ENABLED:
        return ThemeChunkResponse(
            theme_vector=[],
            updated=False,
            diagnostics={"skipped": True, "reason": "theme_ema_disabled"},
        )

    prev = get_theme(req.session_id)
    new_theme, updated, diagnostics = update_theme_ema_chunk(
        req.text,
        prev,
        THEME_EMA_ALPHA_DEFAULT,
        normalize_sentence=_THEME_CHUNK_NORMALIZE_SENTENCE,
        min_content_tokens=_THEME_CHUNK_MIN_CONTENT_TOKENS,
    )
    if updated and new_theme is not None:
        set_theme(req.session_id, new_theme)
        out_vec = new_theme
    else:
        out_vec = prev or []

    diag_slim = {k: diagnostics[k] for k in diagnostics if k in {"skipped", "reason", "approx_content_tokens"}}

    return ThemeChunkResponse(theme_vector=out_vec, updated=updated, diagnostics=diag_slim)


def compute_term_scores_for_request(
    session_id: str,
    terms: list[TermScoreInput],
) -> TermScoreBatchResponse:
    """``POST .../score/terms`` 用：複数用語の素点・テーマ類似・IDF バフを一括算出する。

    テーマは ``THEME_EMA_ENABLED`` が ``True`` のときのみ ``session_id`` に ``theme/chunk`` で保存済みのベクトルを使う。
    無効時は ``theme_linear`` を付けず ``theme_vector_used`` は ``null``。
    IDF は ``get_idf_table()`` のシングルトンを使用する。
    """
    theme: list[float] | None = get_theme(session_id)
    idf_table_loaded = get_idf_table()

    results: list[TermScoreResult] = []
    for t in terms:
        raw = compute_term_score_additive(
            t.lemma,
            occurrence_count=t.occurrence_count,
            theme_vector=theme,
            term_vector=t.term_vector,
            idf_table=idf_table_loaded,
            count_cap=_SCORE_COUNT_CAP,
            theme_sim_weight=_SCORE_THEME_SIM_WEIGHT if THEME_EMA_ENABLED else 0.0,
            idf_weight=_SCORE_IDF_WEIGHT if _SCORE_IDF_WEIGHT > 0 else 0.0,
        )
        results.append(_score_raw_to_term_result(raw))

    return TermScoreBatchResponse(results=results, theme_vector_used=theme)


def _score_raw_to_term_result(raw: dict[str, object]) -> TermScoreResult:
    """:func:`compute_term_score_additive` の連結辞書を、API の ``TermScoreResult`` に正規化する。

    buffs は数値のみに落とし、欠損キーは空辞書になる。
    """
    buffs = raw.get("buffs")
    if not isinstance(buffs, dict):
        buffs = {}

    def _nf(x: object) -> float:
        return float(x) if isinstance(x, (int, float)) else 0.0

    bs = {str(k): _nf(v) for k, v in buffs.items()}

    return TermScoreResult(
        lemma=str(raw.get("lemma", "")),
        base=_nf(raw.get("base")),
        buffs=bs,
        final=_nf(raw.get("final")),
    )


# =============== スコア計算エントリ =======================
def compute_term_score_by_term_info(
    term_infos: list[TermInfo],
    text_vector: list[float] | None = None,
) -> list[tuple[str, str, float]]:
    """
    Args:
        term_infos: 用語情報のリスト。複数意味がある場合は複数エントリになる想定。
        text_vector: チャンク全体のベクトル。テーマ類似の計算に使う。未提供ならテーマ類似はスコアに入れない
    Returns:
        用語、説明、スコアのタプルのリスト。スコアはテーマ類似とIDFを加味したもの。
    """
    score_results = []
    for term_info in term_infos:
        term = term_info.term
        idf = term_info.idf_wiki
        if not term_info.description_embeddings:
            continue

        # 全部の説明のベクトルと類似度を取り、最も文脈に近い説明を選ぶ。
        if text_vector and term_info.description_embeddings:
            best_description, best_similarity = max(
                [
                    (description, cosine_similarity(embedding, text_vector))
                    for description, embedding in term_info.description_embeddings
                ],
                key=lambda x: x[1],
            )
        elif term_info.description_embeddings:
            best_description, _ = term_info.description_embeddings[0]
            best_similarity = 0.0
        
        if idf is None:
            # idfを求める
            # コーパスが完成してから実装予定
            pass
        # scoreと意味を決定
        score = _SCORE_THEME_SIM_WEIGHT * linear_cosine_similarity_to_unit(best_similarity) + _SCORE_IDF_WEIGHT * (idf or 0.0)
        score_results.append((term, best_description, score))
    return score_results

