import app.services.text_analysis as text_analysis
from app.services.text_analysis import (
    dependency_parse,
    morphological_analysis,
    tfidf_scores,
    top_terms_by_tfidf,
    vectorize_content_tokens,
    vectorize_sentence,
)
import math


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


def test_vectorize_content_tokens_excludes_conjunction_in_fallback(monkeypatch) -> None:
    monkeypatch.setattr(text_analysis, "_sudachi_analysis", lambda _text: [])

    result = vectorize_content_tokens("そして、結果を共有する", deduplicate=False)
    surfaces = [token["surface"] for token in result["tokens"]]

    assert "そして" not in surfaces


def test_create_sudachi_tokenizer_returns_none_on_init_error(monkeypatch) -> None:
    class _BrokenDictionary:
        def create(self):
            raise RuntimeError("dictionary resource missing")

    class _BrokenSudachiDictionaryModule:
        @staticmethod
        def Dictionary():
            return _BrokenDictionary()

    monkeypatch.setattr(text_analysis, "sudachi_dictionary", _BrokenSudachiDictionaryModule)
    assert text_analysis._create_sudachi_tokenizer() is None


def test_get_spacy_ja_memoizes_failed_load(monkeypatch) -> None:
    class _BrokenSpacy:
        def __init__(self) -> None:
            self.calls: list[str] = []

        def load(self, model_name: str):
            self.calls.append(model_name)
            raise OSError("model not found")

    broken_spacy = _BrokenSpacy()
    monkeypatch.setattr(text_analysis, "spacy", broken_spacy)
    monkeypatch.setattr(text_analysis, "_SPACY_NLP", text_analysis._SPACY_NLP_UNSET)

    first = text_analysis._get_spacy_ja()
    second = text_analysis._get_spacy_ja()

    assert first is None
    assert second is None
    assert broken_spacy.calls == ["ja_ginza", "ja_ginza_electra"]


def test_morphological_analysis_fallback_keeps_auxiliary_token(monkeypatch) -> None:
    monkeypatch.setattr(text_analysis, "_sudachi_analysis", lambda _text: [])

    tokens = morphological_analysis("これはテストです")
    surfaces = [token["surface"] for token in tokens]

    assert "です" in surfaces
    assert "で" not in surfaces
    assert "す" not in surfaces

    pos_by_surface = {token["surface"]: token["pos"] for token in tokens}
    assert pos_by_surface["です"] == "AUX"


def test_vectorize_sentence_returns_single_vector() -> None:
    result = vectorize_sentence("今日は自然言語処理を勉強して、結果を共有します。")

    assert result["meta"]["vector_dim"] > 0
    assert len(result["sentence_vector"]) == result["meta"]["vector_dim"]
    assert result["meta"]["vector_source"] in {
        "spacy_doc",
        "spacy_token_avg",
        "content_token_avg",
        "hash",
    }


def test_vectorize_sentence_empty_text_returns_empty_vector() -> None:
    result = vectorize_sentence("", normalize=True)

    assert result["sentence_vector"] == []
    assert result["meta"]["vector_dim"] == 0
    assert result["meta"]["vector_source"] == "none"


def test_vectorize_sentence_hash_fallback_honors_normalize_flag(monkeypatch) -> None:
    monkeypatch.setattr(text_analysis, "_get_spacy_ja", lambda: None)
    monkeypatch.setattr(
        text_analysis,
        "vectorize_content_tokens",
        lambda text, deduplicate=False: {"text": text, "meta": {}, "tokens": []},
    )

    raw = vectorize_sentence("hash fallback test", normalize=False)
    normalized = vectorize_sentence("hash fallback test", normalize=True)

    raw_norm = math.sqrt(sum(v * v for v in raw["sentence_vector"]))
    normalized_norm = math.sqrt(sum(v * v for v in normalized["sentence_vector"]))

    assert raw["meta"]["vector_source"] == "hash"
    assert normalized["meta"]["vector_source"] == "hash"
    assert raw["meta"]["normalize"] is False
    assert normalized["meta"]["normalize"] is True
    assert raw["sentence_vector"] != normalized["sentence_vector"]
    assert raw_norm > 1.0
    assert abs(normalized_norm - 1.0) < 1e-6
