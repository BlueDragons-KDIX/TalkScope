"""Quick smoke-test script for text analysis services.

Usage:
    cd Backend
    uv run python scripts/run_text_analysis_checks.py
"""

from app.services.text_analysis import dependency_parse, morphological_analysis, top_terms_by_tfidf


def main() -> None:
    sample_text = "形態素解析と係り受け解析を使って、重要語を見つけます。"
    corpus = [
        "形態素解析を実装する",
        "係り受け解析で文の構造を調べる",
        "TF IDFで重要語を抽出する",
    ]

    tokens = morphological_analysis(sample_text)
    if not tokens:
        raise SystemExit("morphological_analysis returned no tokens")

    deps = dependency_parse(sample_text)
    if not deps:
        raise SystemExit("dependency_parse returned no edges")

    tfidf_top = top_terms_by_tfidf(corpus, top_k=3)
    if not tfidf_top:
        raise SystemExit("top_terms_by_tfidf returned empty result")

    print("[OK] Morphological analysis sample:")
    print(tokens[:8])
    print("\n[OK] Dependency parse sample:")
    print(deps[:8])
    print("\n[OK] TF-IDF top terms sample:")
    print(tfidf_top)


if __name__ == "__main__":
    main()
