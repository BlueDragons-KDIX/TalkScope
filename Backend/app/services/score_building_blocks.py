"""用語スコア・テーマ EMA 向けの純関数／小クラスを一括定義する。

後段の「素点＋バフ／デバフ」合成では、このモジュールから必要な関数だけを import して配線する。
"""

from __future__ import annotations

import json
import math
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path

__all__ = [
    "IdfLookupTable",
    "adjacent_bigram_counts",
    "window_bigram_counts",
    "best_sense_index_by_context",
    "compose_additive_score",
    "cosine_similarity",
    "count_axis_weight",
    "ema_theme_step",
    "is_scored_token_surface",
    "is_term_score_pos_allowed",
    "l2_normalize",
    "linear_cosine_similarity_to_unit",
    "load_idf_table_from_json",
    "log_pmi_with_smoothing",
    "marginal_counts_from_bigrams",
    "should_skip_theme_update",
    "term_adjacent_ppmi_max",
]


# --- コサイン類似度 ------------------------------------------------------------


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """コサイン類似度を ``[-1, 1]`` で返す。どちらかのノルムが 0 のときは ``0.0``。"""
    if len(a) == 0 or len(b) == 0 or a is None or b is None:
        return 0.0
    n = min(len(a), len(b))
    dot = 0.0
    na = 0.0
    nb = 0.0
    for i in range(n):
        x = a[i]
        y = b[i]
        dot += x * y
        na += x * x
        nb += y * y
    denom = (na**0.5) * (nb**0.5)
    if denom == 0.0:
        return 0.0
    sim = dot / denom
    if sim > 1.0:
        return 1.0
    if sim < -1.0:
        return -1.0
    return sim


def best_sense_index_by_context(
    context_vec: Sequence[float],
    sense_vecs: Sequence[Sequence[float]],
) -> int | None:
    """文脈ベクトルとのコサイン類似度が最大となる sense のインデックスを返す。

    multi-sense 運用では文 embedding をリクエスト単位で 1 本に抑え、各 sense 事前埋め込みと
    のみ比較する（比較処理は軽量）。次元が合う候補だけを対象とし、該当なしは ``None``。
    同点では先に現れたインデックスを採用する。
    """
    if not sense_vecs:
        return None
    ctx = list(context_vec)
    best_i: int | None = None
    best_sim = float("-inf")
    for i, sv in enumerate(sense_vecs):
        svl = list(sv)
        if len(svl) != len(ctx):
            continue
        sim = cosine_similarity(ctx, svl)
        if best_i is None or sim > best_sim:
            best_sim = sim
            best_i = i
    return best_i


# --- 類似度の線形正規化（``[-1,1]`` → ``[0,1]``） ------------------------


def linear_cosine_similarity_to_unit(sim: float) -> float:
    """``sim`` を ``[-1, 1]`` から ``(sim + 1) / 2`` で ``[0, 1]`` に写し、範囲外はクリップする。"""
    return max(0.0, min(1.0, (sim + 1.0) / 2.0))


# --- テーマ EMA（L2 正規化・固定 α） -----------------------------------------


def l2_normalize(v: list[float]) -> list[float]:
    """ノルム 1 の L2 単位ベクトルを返す。ノルム 0 のときは ``v`` のコピー。"""
    if not v:
        return []
    s = sum(x * x for x in v) ** 0.5
    if s == 0.0:
        return list(v)
    inv = 1.0 / s
    return [x * inv for x in v]


def ema_theme_step(theme: list[float] | None, v_t: list[float], alpha: float) -> list[float]:
    """``theme' = normalize((1-α)*theme + α*v_t)``。初回は ``theme`` が空なら ``v_t`` を正規化して返す。"""
    if alpha < 0.0 or alpha > 1.0:
        raise ValueError("alpha は 0 以上 1 以下でなければなりません")
    if not v_t:
        raise ValueError("v_t は空にできません")
    if theme is None or len(theme) == 0:
        return l2_normalize(v_t)
    if len(theme) != len(v_t):
        raise ValueError("theme と v_t の長さは一致している必要があります")
    blended = [(1.0 - alpha) * theme[i] + alpha * v_t[i] for i in range(len(v_t))]
    return l2_normalize(blended)


# --- テーマ更新ゲート（相槌除外・短文スキップ等） -------------------------------


_BACKCHANNEL_EXACT: frozenset[str] = frozenset(
    {
        "はい",
        "うん",
        "ええ",
        "なるほど",
        "そうですね",
        "うんうん",
        "はいはい",
        "そうそう",
        "へえ",
        "ふーん",
        "えっと",
        "あのー",
        "あの",
        "はあ",
        "ふむ",
        "そう",
        "うーん",
        "ん",
        "んー",
    }
)


def should_skip_theme_update(
    text: str,
    content_token_count: int | None,
    *,
    min_content_tokens: int = 2,
) -> bool:
    """このチャンクではテーマ EMA を進めないなら ``True``。"""
    stripped = text.strip()
    if not stripped:
        return True
    if content_token_count is not None and content_token_count < min_content_tokens:
        return True
    if stripped in _BACKCHANNEL_EXACT:
        return True
    return False


# --- トークン表層の文字数 ------------------------------------------------------


def is_scored_token_surface(surface: str) -> bool:
    """スコアリングに含める表層形なら ``True``（Unicode 上の文字数が 1 超）。"""
    return len(surface) > 1


# --- 品詞スコープ（名詞・固有名詞、代名詞除外） -------------------------------


_PRONOUN_MARKERS: tuple[str, ...] = (
    "代名詞",
    "PRON",
)

_NOUN_MARKERS: tuple[str, ...] = (
    "名詞",
    "NOUN",
    "PROPN",
    "固有名詞",
)


def is_term_score_pos_allowed(pos: str) -> bool:
    """名詞＋固有名詞を通し、代名詞のみ除外。"""
    if not pos:
        return False
    for m in _PRONOUN_MARKERS:
        if m in pos:
            return False
    return any(m in pos for m in _NOUN_MARKERS)


# --- IDF テーブル（事前計算、未知語は平均） ------------------------------------


class IdfLookupTable:
    """不変の IDF テーブル。未知の語は平均 IDF にフォールバックする。"""

    def __init__(self, term_to_idf: dict[str, float]) -> None:
        if not term_to_idf:
            raise ValueError("term_to_idf は空にできません")
        self._table = dict(term_to_idf)
        self._mean = sum(self._table.values()) / len(self._table)

    @property
    def mean_idf(self) -> float:
        return self._mean

    def lookup(self, term: str) -> float:
        """``term`` の IDF を返す。無ければ ``mean_idf``。"""
        v = self._table.get(term)
        if v is None:
            return self._mean
        return v


def load_idf_table_from_json(path: str | Path, *, min_idf: float | None = None) -> IdfLookupTable:
    """単語とIDF の JSON（キーが単語、値がIDF）を読み、 IdfLookupTableを返す。(開発用)

    ``min_idf`` を指定すると **その値以上の IDF だけ**を載せる（語彙を間引いてメモリを抑える）。
    フィルタ後が空だれば ``ValueError``。
    """
    p = Path(path)
    raw = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("JSON のルートは term から idf への写像オブジェクトである必要があります")
    table: dict[str, float] = {}
    for k, v in raw.items():
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise ValueError(f"語 {k!r} の IDF 値が不正です（数値が必要です）")
        fv = float(v)
        table[str(k)] = fv
    if min_idf is not None:
        table = {k: v for k, v in table.items() if v >= min_idf}
    return IdfLookupTable(table)


# --- 回数軸の重み（中間が最大になる放物線） -------------------------------


def count_axis_weight(count: int, cap: int = 100) -> float:
    """``x = min(count,cap)/cap`` に対し ``4*x*(1-x)`` を返す。``count <= 0`` は ``0``。"""
    if count <= 0:
        return 0.0
    if cap <= 0:
        raise ValueError("cap は正でなければなりません")
    x = min(count, cap) / float(cap)
    return 4.0 * x * (1.0 - x)


# --- PMI (テーマベクトルのスムージング、カウントは呼び出し側) -----------------------------------


def log_pmi_with_smoothing(
    joint_count: int,
    marginal_a: int,
    marginal_b: int,
    total_observations: int,
    *,
    delta: float = 0.5,
) -> float:
    """スムージング付き pointwise log PMI（自然対数）。PPMI 化は呼び出し側で ``max(0, ...)`` 等。"""
    if joint_count < 0 or marginal_a < 0 or marginal_b < 0:
        raise ValueError("結合度数および周辺度数は非負でなければなりません")
    if delta <= 0.0:
        raise ValueError("delta は正でなければなりません")
    t = max(total_observations, 1)
    d = delta
    p_ab = (joint_count + d) / (t + d)
    p_a = (marginal_a + d) / (t + d)
    p_b = (marginal_b + d) / (t + d)
    denom = p_a * p_b
    if denom <= 0.0:
        return 0.0
    ratio = p_ab / denom
    if ratio <= 0.0:
        return 0.0
    return math.log(ratio)


# --- 隣接 bigram → 周辺度数・用語 PPMI（同一発話内の並び向け） -------------------


def adjacent_bigram_counts(
    surfaces: Sequence[str],
    *,
    filter_surface: Callable[[str], bool] | None = None,
) -> dict[tuple[str, str], int]:
    """隣接ペアの出現回数。``filter_surface`` 未指定時は ``is_scored_token_surface`` で両端をフィルタ。"""
    pred = filter_surface if filter_surface is not None else is_scored_token_surface
    out: dict[tuple[str, str], int] = {}
    for i in range(len(surfaces) - 1):
        a, b = surfaces[i], surfaces[i + 1]
        if not pred(a) or not pred(b):
            continue
        key = (a, b)
        out[key] = out.get(key, 0) + 1
    return out


def window_bigram_counts(
    surfaces: Sequence[str],
    *,
    max_token_distance: int,
    filter_surface: Callable[[str], bool] | None = None,
) -> dict[tuple[str, str], int]:
    """トークン列上で index 差が ``1..max_token_distance`` の有向ペアを数える。

    ``max_token_distance == 1`` のときは隣接 bigram と同じ集合になる。
    """
    if max_token_distance < 1:
        raise ValueError("max_token_distance は 1 以上でなければなりません")
    pred = filter_surface if filter_surface is not None else is_scored_token_surface
    out: dict[tuple[str, str], int] = {}
    n = len(surfaces)
    for i in range(n):
        a = surfaces[i]
        if not pred(a):
            continue
        j_max = min(i + max_token_distance, n - 1)
        for j in range(i + 1, j_max + 1):
            b = surfaces[j]
            if not pred(b):
                continue
            key = (a, b)
            out[key] = out.get(key, 0) + 1
    return out


def marginal_counts_from_bigrams(
    bigram_counts: Mapping[tuple[str, str], int],
) -> tuple[dict[str, int], dict[str, int], int]:
    """左語・右語の周辺度数と、bigram 総数（重み付き和）。"""
    left: dict[str, int] = {}
    right: dict[str, int] = {}
    total = 0
    for (a, b), c in bigram_counts.items():
        if c < 0:
            raise ValueError("bigram の度数は非負でなければなりません")
        total += c
        left[a] = left.get(a, 0) + c
        right[b] = right.get(b, 0) + c
    return left, right, total


def term_adjacent_ppmi_max(
    term: str,
    bigram_counts: Mapping[tuple[str, str], int],
    *,
    delta: float = 0.5,
) -> float:
    """``term`` を左または右に含む有向ペアについて **PPMI**（``max(0, log_pmi)``）の最大値。

    ``bigram_counts`` は隣接のみでも窓内ペアでもよい。該当なしは ``0``。
    """
    if not bigram_counts:
        return 0.0
    left_m, right_m, total = marginal_counts_from_bigrams(bigram_counts)
    best = 0.0
    for (a, b), joint in bigram_counts.items():
        if term != a and term != b:
            continue
        ma = left_m.get(a, 0)
        mb = right_m.get(b, 0)
        pmi = log_pmi_with_smoothing(joint, ma, mb, total, delta=delta)
        best = max(best, max(0.0, pmi))
    return best


# --- 素点 + バフ − デバフ（加算合成のひな形） ---------------------------------


def compose_additive_score(
    base: float,
    buffs: Mapping[str, float] | None = None,
    debuffs: Mapping[str, float] | None = None,
    *,
    floor: float = 0.0,
    ceiling: float | None = None,
) -> dict[str, object]:
    """素点にバフ合計を足しデバフ合計を引く。内訳付き dict を返す（API レスポンス組み立て用）。"""
    bdict = dict(buffs or {})
    ddict = dict(debuffs or {})
    buff_total = sum(bdict.values())
    debuff_total = sum(ddict.values())
    raw = base + buff_total - debuff_total
    final = max(floor, raw)
    if ceiling is not None:
        final = min(ceiling, final)
    return {
        "base": base,
        "buff_total": buff_total,
        "debuff_total": debuff_total,
        "buffs": bdict,
        "debuffs": ddict,
        "final": final,
    }
