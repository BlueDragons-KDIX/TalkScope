"""Embedding smoke checks without pytest.

Usage:
    cd Backend
    uv run python scripts/test_embedding.py
"""

from __future__ import annotations

import sys
import time
import math
import asyncio
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.enbedding.spacy_enbedding import call_embedding_api
import app.services.refer_dictionary as refer_dictionary_service
from app.services.refer_dictionary_v1 import _compute_text_embedding, _embed_terms
from app.services.text_analysis import vectorize_pretokenized_words


VECTOR_DIM = 300


def assert_vector_300(vector: list[float], label: str) -> None:
    if not isinstance(vector, list):
        raise AssertionError(f"{label}: vector must be list, got {type(vector).__name__}")
    if len(vector) != VECTOR_DIM:
        raise AssertionError(f"{label}: vector dim must be {VECTOR_DIM}, got {len(vector)}")
    if not all(isinstance(value, float) for value in vector):
        raise AssertionError(f"{label}: vector values must be float")


def test_spacy_embedding_returns_300_dim_vector() -> None:
    vector = call_embedding_api("自然言語処理は文章の意味を扱う技術です。")
    assert_vector_300(vector, "call_embedding_api")


def test_compute_text_embedding_uses_given_callable() -> None:
    def fake_embedder(text: str) -> list[float]:
        if text != "意味説明":
            raise AssertionError("unexpected text")
        return [0.5] * VECTOR_DIM

    vector = _compute_text_embedding(fake_embedder, "意味説明")
    assert_vector_300(vector, "_compute_text_embedding")
    if vector[0] != 0.5:
        raise AssertionError("_compute_text_embedding: callable result was not returned")


def test_compute_text_embedding_falls_back_to_zero_vector() -> None:
    def broken_embedder(_text: str) -> list[float]:
        raise RuntimeError("embedding failed")

    vector = _compute_text_embedding(broken_embedder, "失敗する入力")
    assert_vector_300(vector, "_compute_text_embedding fallback")
    if any(value != 0.0 for value in vector):
        raise AssertionError("_compute_text_embedding fallback: vector must be all zeros")


def test_embed_terms_embeds_each_sense() -> None:
    calls: list[str] = []

    def fake_embedder(text: str) -> list[float]:
        calls.append(text)
        return [float(len(text))] * VECTOR_DIM

    term_infos = _embed_terms(
        fake_embedder,
        {
            "SSE": ["サーバーからクライアントへイベントを送る仕組み"],
            "Python": ["読みやすさを重視したプログラミング言語", "機械学習でも使われる言語"],
        },
    )

    if len(term_infos) != 2:
        raise AssertionError(f"_embed_terms: expected 2 terms, got {len(term_infos)}")
    if calls != [
        "サーバーからクライアントへイベントを送る仕組み",
        "読みやすさを重視したプログラミング言語",
        "機械学習でも使われる言語",
    ]:
        raise AssertionError(f"_embed_terms: unexpected calls {calls}")

    for term_info in term_infos:
        if not term_info.sense:
            raise AssertionError(f"_embed_terms: {term_info.term} has no senses")
        for _description, vector in term_info.sense:
            assert_vector_300(vector, f"_embed_terms {term_info.term}")


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise AssertionError(f"cosine_similarity: vector dims differ ({len(a)} != {len(b)})")

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        raise AssertionError("cosine_similarity: zero vector cannot be compared")

    return dot / (norm_a * norm_b)


def test_cosine_similarity_between_text_and_word_vectors() -> None:
    text_vector = call_embedding_api("自然言語処理では、文章の意味をベクトルで扱います。")
    word_vectors = vectorize_pretokenized_words([("構文", "解析", "処理")])
    if not word_vectors:
        raise AssertionError("vectorize_pretokenized_words returned empty result")

    word_vector = word_vectors[0]
    assert_vector_300(text_vector, "text vector")
    assert_vector_300(word_vector, "word vector")

    similarity = cosine_similarity(text_vector, word_vector)
    if not -1.0 <= similarity <= 1.0:
        raise AssertionError(f"cosine similarity must be in [-1, 1], got {similarity}")

    print(f"    cosine(text, word) = {similarity:.6f}")


async def _lookup_refer_dictionary_vector(term_parts: tuple[str, ...]) -> list[float]:
    class DummyDatabase:
        is_available = False

    original_db = refer_dictionary_service.db
    original_lookup_term_summary = refer_dictionary_service.lookup_term_summary

    try:
        refer_dictionary_service.db = DummyDatabase()
        refer_dictionary_service.lookup_term_summary = lambda term: {
            "summary": f"{term} のテスト用説明です"
        }

        entry = await refer_dictionary_service._lookup_or_create(term_parts)
    finally:
        refer_dictionary_service.db = original_db
        refer_dictionary_service.lookup_term_summary = original_lookup_term_summary

    if entry is None:
        raise AssertionError("refer_dictionary._lookup_or_create returned None")

    vector = entry["meaning_vector"]
    if vector is None:
        raise AssertionError("refer_dictionary returned no meaning_vector")
    return vector


def test_compare_with_refer_dictionary_vector() -> None:
    term_parts = ("自然", "言語", "処理")
    text_vector = call_embedding_api("自然言語処理では、文章の意味をベクトルで扱います。")
    refer_dictionary_vector = asyncio.run(_lookup_refer_dictionary_vector(term_parts))

    assert_vector_300(text_vector, "text vector")
    assert_vector_300(refer_dictionary_vector, "refer_dictionary vector")

    similarity = cosine_similarity(text_vector, refer_dictionary_vector)
    if not -1.0 <= similarity <= 1.0:
        raise AssertionError(f"refer_dictionary cosine similarity must be in [-1, 1], got {similarity}")

    direct_word_vector = vectorize_pretokenized_words([term_parts])[0]
    direct_similarity = cosine_similarity(direct_word_vector, refer_dictionary_vector)
    if direct_similarity < 0.999:
        raise AssertionError(
            "refer_dictionary vector should match vectorize_pretokenized_words output, "
            f"got cosine={direct_similarity}"
        )

    print(f"    cosine(text, refer_dictionary) = {similarity:.6f}")
    print(f"    cosine(word, refer_dictionary) = {direct_similarity:.6f}")


def main() -> None:
    tests = [
        test_spacy_embedding_returns_300_dim_vector,
        test_compute_text_embedding_uses_given_callable,
        test_compute_text_embedding_falls_back_to_zero_vector,
        test_embed_terms_embeds_each_sense,
        test_cosine_similarity_between_text_and_word_vectors,
        test_compare_with_refer_dictionary_vector,
    ]

    total_start = time.perf_counter()
    for test in tests:
        start = time.perf_counter()
        test()
        elapsed = time.perf_counter() - start
        print(f"[OK] {test.__name__} ({elapsed:.3f}s)")

    total_elapsed = time.perf_counter() - total_start
    print(f"\n[OK] all embedding checks passed ({total_elapsed:.3f}s)")


if __name__ == "__main__":
    main()
