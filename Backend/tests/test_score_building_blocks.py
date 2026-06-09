"""``app.services.score_building_blocks`` の関数単位テストを一ファイルに集約。"""

from __future__ import annotations

import sys
from pathlib import Path

# Backend 直下の `app` を解決する（`uv run pytest` でも PYTHONPATH 不要にする）
_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

import json
import math
import tempfile
from pathlib import Path

import pytest

from app.services.score_building_blocks import (
    IdfLookupTable,
    adjacent_bigram_counts,
    window_bigram_counts,
    best_sense_index_by_context,
    compose_additive_score,
    cosine_similarity,
    count_axis_weight,
    ema_theme_step,
    is_scored_token_surface,
    is_term_score_pos_allowed,
    l2_normalize,
    linear_cosine_similarity_to_unit,
    load_idf_table_from_json,
    log_pmi_with_smoothing,
    marginal_counts_from_bigrams,
    should_skip_theme_update,
    term_adjacent_ppmi_max,
)


class TestCosineSimilarity:
    def test_same_direction_is_one(self) -> None:
        assert cosine_similarity([1.0, 0.0], [2.0, 0.0]) == 1.0

    def test_orthogonal_is_zero(self) -> None:
        assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0

    def test_opposite_is_minus_one(self) -> None:
        assert cosine_similarity([-1.0, 0.0], [1.0, 0.0]) == -1.0

    def test_uses_min_length_when_vectors_differ_in_length(self) -> None:
        assert cosine_similarity([1.0, 0.0, 99.0], [1.0, 0.0]) == 1.0

    def test_zero_vector_returns_zero(self) -> None:
        assert cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0

    def test_empty_returns_zero(self) -> None:
        assert cosine_similarity([], [1.0]) == 0.0

    def test_diagonal_normalized(self) -> None:
        a = [1 / math.sqrt(2), 1 / math.sqrt(2)]
        b = [1 / math.sqrt(2), -1 / math.sqrt(2)]
        assert abs(cosine_similarity(a, b)) < 1e-9


class TestBestSenseIndexByContext:
    def test_empty_senses_returns_none(self) -> None:
        assert best_sense_index_by_context([1.0, 0.0], []) is None

    def test_single_sense_is_zero(self) -> None:
        assert best_sense_index_by_context([1.0, 0.0], [[1.0, 0.0]]) == 0

    def test_picks_higher_cosine(self) -> None:
        ctx = [1.0, 0.0]
        senses = [[0.0, 1.0], [1.0, 0.0], [-1.0, 0.0]]
        assert best_sense_index_by_context(ctx, senses) == 1

    def test_skips_dimension_mismatch(self) -> None:
        assert best_sense_index_by_context([1.0, 0.0], [[9.0], [1.0, 0.0]]) == 1

    def test_all_mismatched_returns_none(self) -> None:
        assert best_sense_index_by_context([1.0, 0.0], [[0.0], [0.0, 0.0, 1.0]]) is None


class TestLinearCosineSimilarityToUnit:
    def test_maps_endpoints(self) -> None:
        assert linear_cosine_similarity_to_unit(-1.0) == 0.0
        assert linear_cosine_similarity_to_unit(1.0) == 1.0
        assert linear_cosine_similarity_to_unit(0.0) == 0.5

    def test_clamps_out_of_range(self) -> None:
        assert linear_cosine_similarity_to_unit(-2.0) == 0.0
        assert linear_cosine_similarity_to_unit(2.0) == 1.0


class TestL2NormalizeAndEmaThemeStep:
    def test_l2_normalize_direction(self) -> None:
        v = [3.0, 4.0]
        u = l2_normalize(v)
        assert abs(u[0] - 0.6) < 1e-9 and abs(u[1] - 0.8) < 1e-9

    def test_l2_normalize_zero_vector_returns_copy(self) -> None:
        v = [0.0, 0.0]
        u = l2_normalize(v)
        assert u == [0.0, 0.0]

    def test_ema_first_step_matches_normalized_v_t(self) -> None:
        v_t = [3.0, 4.0]
        out = ema_theme_step(None, v_t, alpha=0.1)
        assert abs(out[0] - 0.6) < 1e-9 and abs(out[1] - 0.8) < 1e-9

    def test_ema_alpha_one_replaces_with_normalized_v_t(self) -> None:
        theme = [1.0, 0.0]
        v_t = [0.0, 2.0]
        out = ema_theme_step(theme, v_t, alpha=1.0)
        assert abs(out[0]) < 1e-9 and abs(out[1] - 1.0) < 1e-9

    def test_ema_small_alpha_stays_near_theme(self) -> None:
        theme = [1.0, 0.0]
        v_t = [0.0, 1.0]
        out = ema_theme_step(theme, v_t, alpha=0.01)
        assert out[0] > 0.99 and out[1] < 0.02

    def test_ema_output_is_unit_length(self) -> None:
        theme = [1.0, 2.0, 3.0]
        v_t = [-1.0, 0.5, 2.0]
        out = ema_theme_step(theme, v_t, alpha=0.2)
        norm = math.sqrt(sum(x * x for x in out))
        assert abs(norm - 1.0) < 1e-9

    def test_ema_raises_on_length_mismatch(self) -> None:
        with pytest.raises(ValueError, match="長さ"):
            ema_theme_step([1.0, 0.0], [1.0, 0.0, 0.0], alpha=0.1)

    def test_ema_raises_on_bad_alpha(self) -> None:
        with pytest.raises(ValueError, match="alpha"):
            ema_theme_step([1.0], [1.0], alpha=1.5)


class TestShouldSkipThemeUpdate:
    def test_skip_blank_and_whitespace(self) -> None:
        assert should_skip_theme_update("", content_token_count=None) is True
        assert should_skip_theme_update("   \n\t", content_token_count=None) is True

    def test_skip_low_content_token_count(self) -> None:
        assert should_skip_theme_update("意味のある文", content_token_count=1, min_content_tokens=2) is True
        assert should_skip_theme_update("意味のある文", content_token_count=2, min_content_tokens=2) is False

    def test_skip_exact_backchannel(self) -> None:
        assert should_skip_theme_update("はい", content_token_count=None) is True
        assert should_skip_theme_update("  なるほど  ", content_token_count=None) is True

    def test_do_not_skip_substantive_text(self) -> None:
        assert should_skip_theme_update("API設計について議論する", content_token_count=5) is False


class TestIsScoredTokenSurface:
    def test_single_unicode_char_excluded(self) -> None:
        assert is_scored_token_surface("a") is False
        assert is_scored_token_surface("1") is False
        assert is_scored_token_surface("あ") is False
        assert is_scored_token_surface(".") is False

    def test_two_or_more_chars_included(self) -> None:
        assert is_scored_token_surface("AI") is True
        assert is_scored_token_surface("API") is True
        assert is_scored_token_surface("自然言語") is True


class TestIsTermScorePosAllowed:
    def test_common_noun_allowed(self) -> None:
        assert is_term_score_pos_allowed("名詞") is True
        assert is_term_score_pos_allowed("名詞-普通名詞-一般") is True

    def test_proper_noun_allowed(self) -> None:
        assert is_term_score_pos_allowed("PROPN") is True
        assert is_term_score_pos_allowed("名詞-固有名詞-人名") is True

    def test_pronoun_excluded_even_if_noun_like(self) -> None:
        assert is_term_score_pos_allowed("名詞-代名詞-*") is False
        assert is_term_score_pos_allowed("PRON") is False

    def test_non_noun_rejected(self) -> None:
        assert is_term_score_pos_allowed("動詞-一般") is False
        assert is_term_score_pos_allowed("形容詞-自立") is False

    def test_empty_pos_rejected(self) -> None:
        assert is_term_score_pos_allowed("") is False


class TestIdfLookupTable:
    def test_lookup_known_term(self) -> None:
        t = IdfLookupTable({"猫": 3.0, "犬": 1.0})
        assert t.lookup("猫") == 3.0

    def test_lookup_unknown_uses_mean(self) -> None:
        t = IdfLookupTable({"a": 1.0, "b": 3.0})
        assert t.mean_idf == 2.0
        assert t.lookup("missing") == 2.0

    def test_empty_table_raises(self) -> None:
        with pytest.raises(ValueError, match="空にできません"):
            IdfLookupTable({})


class TestCountAxisWeight:
    def test_zero_or_negative_count_zero_weight(self) -> None:
        assert count_axis_weight(0) == 0.0
        assert count_axis_weight(-3) == 0.0

    def test_peak_at_half_of_cap(self) -> None:
        cap = 100
        mid = cap // 2
        assert abs(count_axis_weight(mid, cap=cap) - 1.0) < 1e-9

    def test_endpoints_at_cap_zero(self) -> None:
        cap = 50
        assert count_axis_weight(cap, cap=cap) == 0.0
        w_small = count_axis_weight(1, cap=cap)
        assert 0.0 < w_small < 1.0

    def test_counts_above_cap_follow_cap_normalized_shape(self) -> None:
        assert count_axis_weight(999, cap=10) == 0.0

    def test_invalid_cap_raises(self) -> None:
        with pytest.raises(ValueError, match="cap"):
            count_axis_weight(1, cap=0)

    def test_symmetry_around_midpoint(self) -> None:
        cap = 20
        w_left = count_axis_weight(5, cap=cap)
        w_right = count_axis_weight(15, cap=cap)
        assert abs(w_left - w_right) < 1e-9


class TestLogPmiWithSmoothing:
    def test_positive_when_strong_association(self) -> None:
        v = log_pmi_with_smoothing(
            joint_count=50,
            marginal_a=55,
            marginal_b=55,
            total_observations=100,
            delta=0.5,
        )
        assert v > 0.0
        assert math.isfinite(v)

    def test_non_negative_counts_required(self) -> None:
        with pytest.raises(ValueError, match="非負"):
            log_pmi_with_smoothing(-1, 1, 1, 10)

    def test_delta_must_be_positive(self) -> None:
        with pytest.raises(ValueError, match="delta"):
            log_pmi_with_smoothing(1, 1, 1, 10, delta=0.0)

    def test_total_zero_uses_one(self) -> None:
        v = log_pmi_with_smoothing(0, 0, 0, 0, delta=1.0)
        assert math.isfinite(v)


class TestLoadIdfTableFromJson:
    def test_loads_flat_object(self) -> None:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump({"猫": 2.0, "犬": 1.0}, f)
            path = Path(f.name)
        try:
            t = load_idf_table_from_json(path)
            assert t.lookup("猫") == 2.0
            assert t.lookup("unknown") == 1.5
        finally:
            path.unlink(missing_ok=True)

    def test_rejects_non_object_root(self) -> None:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump([1, 2], f)
            path = Path(f.name)
        try:
            with pytest.raises(ValueError, match="JSON のルート"):
                load_idf_table_from_json(path)
        finally:
            path.unlink(missing_ok=True)

    def test_min_idf_keeps_high_only(self) -> None:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump({"a": 1.0, "b": 5.0}, f)
            path = Path(f.name)
        try:
            t = load_idf_table_from_json(path, min_idf=3.0)
            assert t.lookup("b") == pytest.approx(5.0)
            assert t.mean_idf == pytest.approx(5.0)
        finally:
            path.unlink(missing_ok=True)

    def test_min_idf_filters_all_raises(self) -> None:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
            json.dump({"a": 1.0}, f)
            path = Path(f.name)
        try:
            with pytest.raises(ValueError):
                load_idf_table_from_json(path, min_idf=10.0)
        finally:
            path.unlink(missing_ok=True)


class TestAdjacentBigramCounts:
    def test_filters_single_char_by_default(self) -> None:
        c = adjacent_bigram_counts(["A", "自然", "言語", "a"])
        assert ("自然", "言語") in c
        assert c[("自然", "言語")] == 1
        assert all("a" not in p for p in c)

    def test_empty_or_one_yields_empty(self) -> None:
        assert adjacent_bigram_counts([]) == {}
        assert adjacent_bigram_counts(["x"]) == {}


class TestWindowBigramCounts:
    def test_distance_one_matches_adjacent(self) -> None:
        seq = ["自然", "言語", "処理"]
        adj = adjacent_bigram_counts(seq, filter_surface=lambda _: True)
        win = window_bigram_counts(seq, max_token_distance=1, filter_surface=lambda _: True)
        assert adj == win

    def test_window_four_counts_skip_pairs(self) -> None:
        seq = ["自然", "言語", "処理", "モデル"]
        w4 = window_bigram_counts(seq, max_token_distance=4, filter_surface=lambda _: True)
        assert w4[("自然", "言語")] == 1
        assert w4[("自然", "処理")] == 1
        assert w4[("自然", "モデル")] == 1
        assert w4[("言語", "モデル")] == 1
        assert ("自然", "モデル") in w4

    def test_invalid_distance_raises(self) -> None:
        with pytest.raises(ValueError, match="1 以上"):
            window_bigram_counts(["a", "b"], max_token_distance=0, filter_surface=lambda _: True)


class TestMarginalCountsFromBigrams:
    def test_marginals_sum_to_total(self) -> None:
        bg = {("A", "B"): 2, ("A", "C"): 1}
        left, right, total = marginal_counts_from_bigrams(bg)
        assert total == 3
        assert left["A"] == 3
        assert right["B"] == 2
        assert right["C"] == 1

    def test_negative_raises(self) -> None:
        with pytest.raises(ValueError, match="非負"):
            marginal_counts_from_bigrams({("a", "b"): -1})


class TestTermAdjacentPpmiMax:
    def test_zero_when_no_bigrams(self) -> None:
        assert term_adjacent_ppmi_max("X", {}) == 0.0

    def test_respects_term_membership(self) -> None:
        bg = adjacent_bigram_counts(["自然", "言語", "処理"])
        v_lang = term_adjacent_ppmi_max("言語", bg)
        v_other = term_adjacent_ppmi_max("存在しない", bg)
        assert v_lang >= 0.0
        assert v_other == 0.0


class TestComposeAdditiveScore:
    def test_additive_with_floor(self) -> None:
        r = compose_additive_score(1.0, {"idf": 0.5}, {"noise": 2.0}, floor=0.0)
        assert r["base"] == 1.0
        assert r["buff_total"] == 0.5
        assert r["debuff_total"] == 2.0
        assert r["final"] == 0.0

    def test_ceiling(self) -> None:
        r = compose_additive_score(10.0, {"a": 100.0}, ceiling=50.0)
        assert r["final"] == 50.0

    def test_empty_buff_debuff(self) -> None:
        r = compose_additive_score(3.14)
        assert r["final"] == 3.14
        assert r["buffs"] == {}
        assert r["debuffs"] == {}
