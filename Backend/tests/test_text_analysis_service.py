from app.services.text_analysis import (
    dependency_parse,
    morphological_analysis,
    tfidf_scores,
    top_terms_by_tfidf,
    vectorize_content_tokens,
)


def test_morphological_analysis_returns_tokens() -> None:
    text = "自然言語処理を勉強します。"
    tokens = morphological_analysis(text)

    assert len(tokens) > 0
    assert {"surface", "base_form", "pos", "start", "end"}.issubset(tokens[0].keys())


def test_dependency_parse_returns_non_empty_edges() -> None:
    text = "形態素解析で重要語を抽出する"
    edges = dependency_parse(text)

    assert len(edges) > 0
    assert {"index", "surface", "pos", "head", "relation"}.issubset(edges[0].keys())
    assert any(edge["head"] == -1 for edge in edges)


def test_tfidf_scores_prefers_discriminative_term() -> None:
    corpus = [
        "apple orange apple",
        "orange banana",
        "banana banana kiwi",
    ]

    results = tfidf_scores(corpus)
    assert len(results) == 3
    assert results[0]["apple"] > results[0]["orange"]


def test_top_terms_by_tfidf_respects_top_k() -> None:
    corpus = [
        "nlp parsing morphology tfidf",
        "nlp tfidf",
    ]
    top_terms = top_terms_by_tfidf(corpus, top_k=2)

    assert len(top_terms) == 2
    assert len(top_terms[0]) <= 2


def test_vectorize_content_tokens_filters_particles_and_conjunctions() -> None:
    text = "今日は自然言語処理を勉強しますが、そして結果を共有します。"
    result = vectorize_content_tokens(text, deduplicate=False)

    surfaces = [token["surface"] for token in result["tokens"]]
    assert "は" not in surfaces
    assert "が" not in surfaces
    assert "そして" not in surfaces

    assert result["meta"]["vector_dim"] > 0
    assert len(result["tokens"]) > 0
    assert all(len(token["vector"]) == token["vector_dim"] for token in result["tokens"])
