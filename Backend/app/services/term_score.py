"""用語スコア・テーマ EMA・インメモリセッション・API 向け応答までを一元化する。

- 形態素は ``text_analysis.morphological_analysis`` / ``vectorize_sentence`` を利用（再実装しない）
- 数式・構造単体は ``score_building_blocks``
- 複数ワーカーではプロセス内セッションは共有されない（本番の共有ストアは別タスクで検討）

設計方針:

- **文ベクトル／重い前処理の回数**: テーマ更新ではチャンクごとに ``vectorize_sentence`` を高々 1 回。
  用語スコアの **バッチ** では、チャンク全文に対する隣接 bigram 用の形態素列を **リクエストにつき 1 回**
  だけ求め、各用語計算に流用する（embedding 同様、同一入力の重複ワークを避ける）。
- **multi-sense**: 将来、語あたり複数 sense ベクトルがある場合は ``best_sense_index_by_context`` で
  文脈ベクトルに対する argmax を基本形とする（LLM・初出生成は同期から外す前提で別タスク）。
"""

from __future__ import annotations

__all__ = [
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

from collections.abc import Mapping
from threading import Lock
from typing import Any

from app.schemas.score_analysis import (
    TermScoreBatchResponse,
    TermScoreInput,
    TermScoreResult,
    TermScoreWeights,
    ThemeChunkRequest,
    ThemeChunkResponse,
)
from app.services.score_building_blocks import (
    IdfLookupTable,
    adjacent_bigram_counts,
    window_bigram_counts,
    compose_additive_score,
    cosine_similarity,
    count_axis_weight,
    ema_theme_step,
    is_scored_token_surface,
    is_term_score_pos_allowed,
    linear_cosine_similarity_to_unit,
    should_skip_theme_update,
    term_adjacent_ppmi_max,
)
from app.services.idf_runtime import get_idf_table
from app.services.text_analysis import morphological_analysis, vectorize_sentence

# ── 形態素・ベクトル化への接続（フィルタ） ────────────────────────────


def morph_tokens_for_scoring(text: str) -> list[dict[str, Any]]:
    """スコア計算に必要となる対象となる形態素だけを抽出する。(名詞・固有名詞のみ、代名詞は除外)

    Sudachi/GiNZa 経由の分析結果へ **名詞系・短文除外・代名詞除外**などのフィルタをかけ、
    ``base_form`` を確定させた辞書リストを返す（以降 PMI・回数計算が同じ規則を共有する）。
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
    bigram／窓カウントをチャンクで 1 回だけ取るときの入力に使う。
    """
    return [m["base_form"] for m in morph_tokens_for_scoring(text)]


def adjacent_bigrams_for_scoring_text(text: str) -> dict[tuple[str, str], int]:
    """単一チャンク内での隣接共起カウント（PMI／PPMI バフの材料）。"""
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
    occurrence_count: int,
    chunk_text_for_bigrams: str,
    chunk_adjacent_bigrams: Mapping[tuple[str, str], int] | None = None,
    theme_vector: list[float] | None = None,
    term_vector: list[float] | None = None,
    idf_table: IdfLookupTable | None = None,
    count_cap: int = 100,
    theme_sim_weight: float = 0.5,
    idf_weight: float = 0.08,
    ppmi_clip: float = 3.0,
    ppmi_weight: float = 0.2,
    debuffs: Mapping[str, float] | None = None,
) -> dict[str, Any]:
    """
    1用語ぶんの素点と各種バフを足し込み最終値を決める関数。

    - **素点**: ``occurrence_count`` を ``count_axis_weight`` に通した値。
    - **テーマ類似バフ**: 任意のセッション／override テーマベクトルと ``term_vector`` の類似。
    - **IDF バフ**: ``idf_table`` が非 ``None`` かつ ``idf_weight != 0`` のときのみ。
      テーブルは通常 ``idf_runtime.get_idf_table()``（起動時に DB ``term_idf`` または JSON から構築済み）。
    - **PPMI バフ**: 渡されたチャンク内 bigram カウントに基づく（隣接か窓かは上位の ``compute_term_scores_for_request`` が決める）。

    ``chunk_adjacent_bigrams`` が与えられたときは PMI 入力にのみそれを使い、バッチ API で
    形態素解析をチャンクあたり 1 回に抑える。
    """
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

    if ppmi_weight != 0.0:
        bg: dict[tuple[str, str], int]
        if chunk_adjacent_bigrams is not None:
            bg = dict(chunk_adjacent_bigrams)
        elif chunk_text_for_bigrams.strip():
            bg = adjacent_bigrams_for_scoring_text(chunk_text_for_bigrams)
        else:
            bg = {}
        if bg:
            raw_p = term_adjacent_ppmi_max(lemma, bg)
            clipped = min(raw_p, ppmi_clip)
            buffs["ppmi_max_clipped"] = ppmi_weight * clipped

    composed = compose_additive_score(base, buffs, debuffs, floor=0.0)

    return {
        **composed,
        "lemma": lemma,
        "occurrence_count": occurrence_count,
    }


# ── インメモリ・テーマセッション ───────────────────────────────────────
#
# ``POST .../theme/chunk`` で更新したテーマベクトルを、クライアントが発行する session_id で保持する。
# 単一プロセスのみ有効・複数ワーカー間は共有しない（本番の共有ストアは別タスク）。

_lock = Lock()
_sessions: dict[str, list[float]] = {}


def get_theme(session_id: str) -> list[float] | None:
    """セッションに保存済みのテーマベクトルを返す（未設定なら ``None``）。コピーなのでミュータブル変更はしないこと。"""
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
    prev = get_theme(req.session_id)
    new_theme, updated, diagnostics = update_theme_ema_chunk(
        req.text,
        prev,
        req.alpha,
        normalize_sentence=req.normalize_sentence,
        min_content_tokens=req.min_content_tokens,
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
    chunk_text_for_bigrams: str,
    terms: list[TermScoreInput],
    *,
    theme_vector_override: list[float] | None,
    use_session_theme: bool,
    weights: TermScoreWeights,
    debuffs: dict[str, float] | None,
) -> TermScoreBatchResponse:
    """``POST .../score/terms`` 用：**複数用語をまとめて**スコアし PPMI 用 bigram はチャンク 1 回分だけ算出する。

    セッションに紐づくテーマは ``use_session_theme`` とオーバーライドで選択。
    **IDF は** ``get_idf_table()`` のシングルトン（DB 読み込みは起動時のみ）をすべての語に共通で渡す。
    """
    theme: list[float] | None = None
    if use_session_theme:
        theme = theme_vector_override if theme_vector_override is not None else get_theme(session_id)
    elif theme_vector_override is not None:
        theme = theme_vector_override

    shared_bigrams: dict[tuple[str, str], int] | None = None
    if weights.ppmi_weight != 0.0 and chunk_text_for_bigrams.strip():
        lemmas = scoring_lemmas_in_order(chunk_text_for_bigrams)
        if weights.pmi_cooccurrence == "window":
            shared_bigrams = window_bigram_counts(
                lemmas,
                max_token_distance=weights.pmi_window_max_distance,
                filter_surface=lambda _: True,
            )
        else:
            shared_bigrams = adjacent_bigram_counts(lemmas, filter_surface=lambda _: True)

    # 起動時に DB(JSON) で構築済み。リクエストごとには DB に触れない。
    idf_table_loaded = get_idf_table()

    results: list[TermScoreResult] = []
    for t in terms:
        raw = compute_term_score_additive(
            t.lemma,
            occurrence_count=t.occurrence_count,
            chunk_text_for_bigrams=chunk_text_for_bigrams,
            chunk_adjacent_bigrams=shared_bigrams,
            theme_vector=theme,
            term_vector=t.term_vector,
            idf_table=idf_table_loaded,
            count_cap=weights.count_cap,
            theme_sim_weight=weights.theme_sim_weight,
            idf_weight=weights.idf_weight if weights.idf_weight > 0 else 0.0,
            ppmi_clip=weights.ppmi_clip,
            ppmi_weight=weights.ppmi_weight,
            debuffs=debuffs,
        )
        results.append(_score_raw_to_term_result(raw))

    return TermScoreBatchResponse(results=results, theme_vector_used=theme)


def _score_raw_to_term_result(raw: dict[str, object]) -> TermScoreResult:
    """:func:`compute_term_score_additive` の連結辞書を、API の ``TermScoreResult`` に正規化する。

    buffs／debuffs は数値のみに落とし、欠損キーは既定値になる。
    """
    buffs = raw.get("buffs")
    debuffs_raw = raw.get("debuffs")
    if not isinstance(buffs, dict):
        buffs = {}
    if not isinstance(debuffs_raw, dict):
        debuffs_raw = {}

    def _nf(x: object) -> float:
        return float(x) if isinstance(x, (int, float)) else 0.0

    bs = {str(k): _nf(v) for k, v in buffs.items()}
    ds = {str(k): _nf(v) for k, v in debuffs_raw.items()}

    return TermScoreResult(
        lemma=str(raw.get("lemma", "")),
        occurrence_count=int(raw.get("occurrence_count", 0)),
        base=_nf(raw.get("base")),
        buff_total=_nf(raw.get("buff_total")),
        debuff_total=_nf(raw.get("debuff_total")),
        buffs=bs,
        debuffs=ds,
        final=_nf(raw.get("final")),
    )
