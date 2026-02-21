"""Text analysis services for LexiFlow backend.

This module intentionally provides a dependency-light baseline implementation.
If optional NLP libraries are available, they are used automatically.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
import hashlib
import math
import re
from typing import Any

try:
    from sudachipy import dictionary as sudachi_dictionary
    from sudachipy import tokenizer as sudachi_tokenizer
except Exception:  # pragma: no cover - optional dependency
    sudachi_dictionary = None
    sudachi_tokenizer = None

try:
    import spacy
except Exception:  # pragma: no cover - optional dependency
    spacy = None

try:
    import ginza  # noqa: F401
except Exception:  # pragma: no cover - optional dependency
    ginza = None


# Sudachiの辞書リソースが欠けている環境でも起動できるよう、
# 初期化失敗はNoneにフォールバックする。
def _create_sudachi_tokenizer() -> Any | None:
    if sudachi_dictionary is None:
        return None
    try:
        return sudachi_dictionary.Dictionary().create()
    except Exception:  # pragma: no cover - optional dictionary resource
        return None


_SUDACHI_TOKENIZER = _create_sudachi_tokenizer()
_SUDACHI_MODE = sudachi_tokenizer.Tokenizer.SplitMode.C if sudachi_tokenizer else None
_SPACY_NLP_UNSET = object()
_SPACY_NLP: Any | None | object = _SPACY_NLP_UNSET


# spaCyモデルのロードは遅いので遅延初期化する。
# 失敗時もNoneをキャッシュして毎回の再試行を避ける。
def _get_spacy_ja() -> Any | None:
    """Lazy-load spaCy Japanese model (GiNZA) if available."""
    global _SPACY_NLP
    if _SPACY_NLP is not _SPACY_NLP_UNSET:
        return _SPACY_NLP

    if spacy is None:
        _SPACY_NLP = None
        return None

    try:
        _SPACY_NLP = spacy.load("ja_ginza")
    except Exception:  # pragma: no cover - optional model
        _SPACY_NLP = None

    if _SPACY_NLP is None:
        try:
            _SPACY_NLP = spacy.load("ja_ginza_electra")
        except Exception:  # pragma: no cover - optional model
            _SPACY_NLP = None

    return _SPACY_NLP


def _find_surface_offset(text: str, surface: str, cursor: int) -> tuple[int, int]:
    start = text.find(surface, cursor)
    if start == -1:
        start = cursor
    end = start + len(surface)
    return start, end


def _sudachi_analysis(text: str) -> list[dict[str, Any]]:
    if not _SUDACHI_TOKENIZER or _SUDACHI_MODE is None:
        return []

    results: list[dict[str, Any]] = []
    cursor = 0
    for morpheme in _SUDACHI_TOKENIZER.tokenize(text, _SUDACHI_MODE):
        surface = morpheme.surface()
        start, end = _find_surface_offset(text, surface, cursor)
        cursor = end

        part_of_speech = morpheme.part_of_speech()
        pos = part_of_speech[0] if part_of_speech else "UNKNOWN"
        base_form = morpheme.dictionary_form() or surface
        results.append(
            {
                "surface": surface,
                "base_form": base_form,
                "pos": pos,
                "start": start,
                "end": end,
            }
        )

    return results


@dataclass
class Morpheme:
    surface: str
    base_form: str
    pos: str
    start: int
    end: int


@dataclass
class DependencyEdge:
    index: int
    surface: str
    pos: str
    head: int
    relation: str


_DEFAULT_VECTOR_INCLUDE_POS = {
    "NOUN",
    "PROPN",
    "VERB",
    "ADJ",
    "ALPHA",
    "NUM",
    "名詞",
    "動詞",
    "形容詞",
    "形状詞",
}
_DEFAULT_VECTOR_EXCLUDE_POS = {
    "CCONJ",
    "SCONJ",
    "CONJ",
    "接続詞",
    "PART",
    "ADP",
    "助詞",
    "AUX",
    "助動詞",
    "PUNCT",
    "補助記号",
    "SYM",
    "記号",
}
_HASH_VECTOR_DIM = 64


_PARTICLE_CANDIDATES = [
    "から",
    "まで",
    "より",
    "は",
    "が",
    "を",
    "に",
    "へ",
    "と",
    "で",
    "や",
    "の",
    "も",
]
_AUXILIARY_CANDIDATES = ["られる", "れる", "ない", "たい", "ます", "です", "だ"]
_AUXILIARY_SET = set(_AUXILIARY_CANDIDATES)


# 日本語文字列を助動詞・助詞単位で粗く分割する。
# まず助動詞を優先して切り出し、です -> で + す の誤分割を避ける。
def _split_japanese_chunk(chunk: str, chunk_start: int) -> list[tuple[str, int, int]]:
    """Rudimentary Japanese split by common particles."""
    tokens: list[tuple[str, int, int]] = []
    i = 0
    buffer_start = 0

    while i < len(chunk):
        matched_auxiliary = None
        for auxiliary in _AUXILIARY_CANDIDATES:
            if chunk.startswith(auxiliary, i):
                matched_auxiliary = auxiliary
                break

        if matched_auxiliary is not None:
            if buffer_start < i:
                token = chunk[buffer_start:i]
                tokens.append((token, chunk_start + buffer_start, chunk_start + i))

            a_end = i + len(matched_auxiliary)
            tokens.append((matched_auxiliary, chunk_start + i, chunk_start + a_end))
            i = a_end
            buffer_start = a_end
            continue

        # 助動詞に該当しない場合だけ助詞候補で分割する。
        matched = None
        for particle in _PARTICLE_CANDIDATES:
            if chunk.startswith(particle, i):
                matched = particle
                break

        if matched is None:
            i += 1
            continue

        if buffer_start < i:
            token = chunk[buffer_start:i]
            tokens.append((token, chunk_start + buffer_start, chunk_start + i))

        p_end = i + len(matched)
        tokens.append((matched, chunk_start + i, chunk_start + p_end))
        i = p_end
        buffer_start = p_end

    if buffer_start < len(chunk):
        token = chunk[buffer_start:]
        tokens.append((token, chunk_start + buffer_start, chunk_start + len(chunk)))

    return [token for token in tokens if token[0]]


def _fallback_split(text: str) -> list[tuple[str, int, int]]:
    """Split text into coarse tokens while keeping character offsets."""
    pattern = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+(?:\.[0-9]+)?|[ぁ-んァ-ンー一-龥]+")
    results: list[tuple[str, int, int]] = []

    for m in pattern.finditer(text):
        surface = m.group(0)
        start, end = m.start(), m.end()
        if re.fullmatch(r"[ぁ-んァ-ンー一-龥]+", surface):
            results.extend(_split_japanese_chunk(surface, start))
        else:
            results.append((surface, start, end))

    return results


def _guess_pos(surface: str) -> str:
    particles = {
        "は",
        "が",
        "を",
        "に",
        "へ",
        "と",
        "で",
        "や",
        "の",
        "も",
        "から",
        "まで",
        "より",
    }
    conjunctions = {
        "そして",
        "しかし",
        "また",
        "または",
        "あるいは",
        "ただし",
        "つまり",
        "なお",
        "一方",
        "だから",
        "なので",
        "それで",
    }

    if surface in particles:
        return "PART"
    if surface in _AUXILIARY_SET:
        return "AUX"
    if surface in conjunctions:
        return "CONJ"
    if re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", surface):
        return "NUM"
    if re.fullmatch(r"[A-Za-z]+(?:'[A-Za-z]+)?", surface):
        return "ALPHA"
    if surface.endswith(("する", "した", "して", "ます", "ない", "れる", "られる", "たい")):
        return "VERB"
    if len(surface) > 1 and surface.endswith("い"):
        return "ADJ"
    # 最後は内容語側に倒す（フォールバック簡易判定）。
    return "NOUN"


# 形態素解析の正規ルート。Sudachiが使えない環境では
# 文字種ベースのフォールバック分割 + 簡易品詞推定で継続する。
def morphological_analysis(text: str) -> list[dict[str, Any]]:
    """Run morphological analysis and return a JSON-friendly token list.

    Returns:
        A list of dict with keys: surface, base_form, pos, start, end.
    """
    if not text.strip():
        return []

    sudachi_tokens = _sudachi_analysis(text)
    if sudachi_tokens:
        return sudachi_tokens

    # Sudachi非利用時のフォールバック結果を同じスキーマで返す。
    return [
        {
            "surface": surface,
            "base_form": surface,
            "pos": _guess_pos(surface),
            "start": start,
            "end": end,
        }
        for surface, start, end in _fallback_split(text)
    ]


def dependency_parse(text: str) -> list[dict[str, Any]]:
    """Run dependency parsing.

    If spaCy Japanese model is available, use it.
    Otherwise, provide a deterministic heuristic dependency structure.
    """
    if not text.strip():
        return []

    nlp = _get_spacy_ja()
    if nlp:
        # spaCy/GiNZAが利用可能なら、その依存構造を優先する。
        doc = nlp(text)
        edges: list[dict[str, Any]] = []
        for token in doc:
            if token.is_space:
                continue
            head = token.head.i if token.head.i != token.i else -1
            edges.append(
                {
                    "index": token.i,
                    "surface": token.text,
                    "pos": token.pos_ or "UNKNOWN",
                    "head": head,
                    "relation": token.dep_ or "dep",
                }
            )
        return edges

    tokens = morphological_analysis(text)
    if not tokens:
        return []

    edges: list[dict[str, Any]] = []
    last_content_index = -1

    for i, token in enumerate(tokens):
        pos = token["pos"]

        if i == 0:
            head = -1
            relation = "root"
        elif pos in {"PART", "助詞"}:
            head = max(i - 1, 0)
            relation = "case"
        elif pos in {"AUX", "助動詞"}:
            head = max(i - 1, 0)
            relation = "aux"
        elif last_content_index >= 0:
            head = last_content_index
            relation = "dep"
        else:
            head = i - 1
            relation = "dep"

        # 直近の内容語を保持して、後続語の係り先推定に使う。
        if pos in {"NOUN", "VERB", "ADJ", "名詞", "動詞", "形容詞", "ALPHA"}:
            last_content_index = i

        edges.append(
            {
                "index": i,
                "surface": token["surface"],
                "pos": pos,
                "head": head,
                "relation": relation,
            }
        )

    return edges


# 外部モデルが使えない場合の最終フォールバック。
# 語から決定的に同じベクトルを生成する（疑似埋め込み）。
def _build_hashed_vector(term: str, dim: int, *, normalize: bool = True) -> list[float]:
    seed = hashlib.sha256(term.encode("utf-8")).digest()
    values: list[float] = []
    counter = 0

    while len(values) < dim:
        block = hashlib.sha256(seed + counter.to_bytes(4, "little")).digest()
        for i in range(0, len(block), 4):
            if len(values) >= dim:
                break
            raw = int.from_bytes(block[i : i + 4], "little", signed=False)
            values.append((raw / 4294967295.0) * 2.0 - 1.0)
        counter += 1

    if not normalize:
        return values

    norm = math.sqrt(sum(v * v for v in values))
    if norm <= 0.0:
        return [0.0] * dim

    return [v / norm for v in values]


def _average_vectors(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    dim = len(vectors[0])
    totals = [0.0] * dim
    for vec in vectors:
        for i, value in enumerate(vec):
            totals[i] += float(value)
    count = len(vectors)
    return [v / count for v in totals]


def _l2_normalize(vector: list[float]) -> list[float]:
    if not vector:
        return []
    norm = math.sqrt(sum(v * v for v in vector))
    if norm <= 0.0:
        return vector
    return [v / norm for v in vector]


# ベクトル次元はモデル語彙 -> token vector -> ハッシュ既定値の順で決定する。
def _resolve_vector_dim(nlp: Any | None, doc: Any | None) -> int:
    if nlp is not None:
        dim = int(getattr(nlp.vocab, "vectors_length", 0) or 0)
        if dim > 0:
            return dim
    if doc is not None:
        for token in doc:
            if token.is_space:
                continue
            vec = getattr(token, "vector", None)
            if vec is not None:
                vec_len = len(vec)
                if vec_len > 0:
                    return vec_len
    return _HASH_VECTOR_DIM


def _get_doc_vector(
    doc: Any,
    surface: str,
    base_form: str,
    start: int,
    end: int,
) -> list[float]:
    # 取得優先順:
    # 1) 文字オフセット対応のspanベクトル
    # 2) オーバーラップtoken平均
    # 3) base_form語彙ベクトル
    # 4) surface語彙ベクトル
    span = doc.char_span(start, end, alignment_mode="expand")
    if span is not None and span.has_vector and float(span.vector_norm) > 0.0:
        return [float(v) for v in span.vector]

    overlap_vectors: list[list[float]] = []
    for token in doc:
        if token.is_space:
            continue
        token_start = token.idx
        token_end = token.idx + len(token.text)
        if token_end <= start or end <= token_start:
            continue
        if token.has_vector and float(token.vector_norm) > 0.0:
            overlap_vectors.append([float(v) for v in token.vector])
    if overlap_vectors:
        return _average_vectors(overlap_vectors)

    lexeme = doc.vocab[base_form]
    if lexeme.has_vector and float(lexeme.vector_norm) > 0.0:
        return [float(v) for v in lexeme.vector]

    surface_lexeme = doc.vocab[surface]
    if surface_lexeme.has_vector and float(surface_lexeme.vector_norm) > 0.0:
        return [float(v) for v in surface_lexeme.vector]

    return []


def _should_vectorize_pos(pos: str, include_pos: set[str], exclude_pos: set[str]) -> bool:
    if pos in exclude_pos:
        return False
    return pos in include_pos


def vectorize_content_tokens(
    text: str,
    include_pos: list[str] | None = None,
    exclude_pos: list[str] | None = None,
    min_length: int = 1,
    deduplicate: bool = False,
) -> dict[str, Any]:
    """Vectorize content tokens from text.

    Uses `morphological_analysis` as the primary token source, filters by POS,
    and returns one vector per target token.
    """
    if not text.strip():
        return {
            "text": text,
            "meta": {
                "model": "none",
                "vector_dim": 0,
                "input_token_count": 0,
                "output_token_count": 0,
            },
            "tokens": [],
        }

    tokens = morphological_analysis(text)
    # include/excludeはリクエストで上書き可能。未指定時は既定セットを使う。
    include_set = set(include_pos) if include_pos is not None else set(_DEFAULT_VECTOR_INCLUDE_POS)
    exclude_set = set(exclude_pos) if exclude_pos is not None else set(_DEFAULT_VECTOR_EXCLUDE_POS)

    nlp = _get_spacy_ja()
    doc = nlp(text) if nlp else None
    vector_dim = _resolve_vector_dim(nlp, doc)

    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    source_map: Counter[str] = Counter()

    for token in tokens:
        pos = token["pos"]
        # 接続詞/助詞など、対象外品詞はここで除外する。
        if not _should_vectorize_pos(pos, include_set, exclude_set):
            continue

        base_form = token["base_form"]
        lemma = base_form.strip().lower()
        # 1文字語やノイズ語を抑えるための長さフィルタ。
        if len(lemma) < min_length:
            continue

        # 同一語集約モード時は同じlemmaを1件だけ返す。
        if deduplicate and lemma in seen:
            continue
        seen.add(lemma)

        vector = []
        source = "hash"
        if doc is not None:
            vector = _get_doc_vector(
                doc=doc,
                surface=token["surface"],
                base_form=base_form,
                start=token["start"],
                end=token["end"],
            )
            if vector:
                source = "spacy"

        # spaCyで取れない語はハッシュベクトルで必ず埋める。
        if not vector:
            vector = _build_hashed_vector(base_form, vector_dim)

        source_map[source] += 1
        results.append(
            {
                "surface": token["surface"],
                "base_form": base_form,
                "pos": pos,
                "start": token["start"],
                "end": token["end"],
                "vector": [round(float(v), 6) for v in vector],
                "vector_dim": len(vector),
                "vector_source": source,
            }
        )

    if vector_dim == 0 and results:
        vector_dim = results[0]["vector_dim"]

    model_name = "hash-fallback"
    if nlp is not None:
        model_name = str(nlp.meta.get("name", "ja_ginza"))

    # フロント利用を想定し、メタ情報とトークン配列をまとめて返す。
    return {
        "text": text,
        "meta": {
            "model": model_name,
            "vector_dim": vector_dim,
            "input_token_count": len(tokens),
            "output_token_count": len(results),
            "vector_source_counts": dict(source_map),
        },
        "tokens": results,
    }


def vectorize_sentence(text: str, normalize: bool = True) -> dict[str, Any]:
    """Vectorize the whole sentence and return one vector."""
    if not text.strip():
        return {
            "text": text,
            "meta": {
                "model": "none",
                "vector_dim": 0,
                "vector_source": "none",
                "normalize": normalize,
                "input_token_count": 0,
                "content_token_count": 0,
            },
            "sentence_vector": [],
        }

    tokens = morphological_analysis(text)
    nlp = _get_spacy_ja()
    doc = nlp(text) if nlp else None
    vector_source = "hash"
    sentence_vector: list[float] = []
    content_token_count = 0

    if doc is not None and doc.has_vector and float(doc.vector_norm) > 0.0:
        sentence_vector = [float(v) for v in doc.vector]
        vector_source = "spacy_doc"

    if not sentence_vector and doc is not None:
        token_vectors = [
            [float(v) for v in token.vector]
            for token in doc
            if (not token.is_space) and token.has_vector and float(token.vector_norm) > 0.0
        ]
        if token_vectors:
            sentence_vector = _average_vectors(token_vectors)
            vector_source = "spacy_token_avg"

    if not sentence_vector:
        content = vectorize_content_tokens(text=text, deduplicate=False)
        content_vectors = [token["vector"] for token in content["tokens"] if token.get("vector")]
        content_token_count = len(content_vectors)
        if content_vectors:
            sentence_vector = _average_vectors(content_vectors)
            vector_source = "content_token_avg"

    if not sentence_vector:
        dim = _resolve_vector_dim(nlp, doc)
        # normalize=False のときは生ベクトルを返すため、ここでは未正規化で生成する。
        sentence_vector = _build_hashed_vector(text, dim, normalize=False)
        vector_source = "hash"

    if normalize:
        sentence_vector = _l2_normalize(sentence_vector)

    vector_dim = len(sentence_vector)
    model_name = "hash-fallback"
    if nlp is not None:
        model_name = str(nlp.meta.get("name", "ja_ginza"))

    if content_token_count == 0:
        content_token_count = len(
            [
                token
                for token in tokens
                if _should_vectorize_pos(
                    token["pos"], _DEFAULT_VECTOR_INCLUDE_POS, _DEFAULT_VECTOR_EXCLUDE_POS
                )
            ]
        )

    return {
        "text": text,
        "meta": {
            "model": model_name,
            "vector_dim": vector_dim,
            "vector_source": vector_source,
            "normalize": normalize,
            "input_token_count": len(tokens),
            "content_token_count": content_token_count,
        },
        "sentence_vector": [round(float(v), 6) for v in sentence_vector],
    }


def _terms_for_tfidf(text: str) -> list[str]:
    terms = []
    for token in morphological_analysis(text):
        pos = token["pos"]
        # TF-IDFは内容語のみを対象にする。
        if pos in {"NOUN", "VERB", "ADJ", "名詞", "動詞", "形容詞", "ALPHA"}:
            term = token["base_form"].lower()
            if len(term) >= 2:
                terms.append(term)
    return terms


def tfidf_scores(corpus: list[str]) -> list[dict[str, float]]:
    """Calculate TF-IDF scores per document.

    Args:
        corpus: List of raw documents.

    Returns:
        List of dicts: one dict per document, term -> tf-idf score.
    """
    if not corpus:
        return []

    tokenized_docs = [_terms_for_tfidf(doc) for doc in corpus]
    doc_count = len(tokenized_docs)

    doc_freq: dict[str, int] = defaultdict(int)
    # DF: 1文書内で重複を除いた出現有無だけを数える。
    for terms in tokenized_docs:
        for term in set(terms):
            doc_freq[term] += 1

    results: list[dict[str, float]] = []
    for terms in tokenized_docs:
        if not terms:
            results.append({})
            continue

        term_counts = Counter(terms)
        length = len(terms)
        score_map: dict[str, float] = {}

        for term, count in term_counts.items():
            # 平滑化付きIDFで、未出現/全出現の極端値を避ける。
            tf = count / length
            idf = math.log((1 + doc_count) / (1 + doc_freq[term])) + 1.0
            score_map[term] = tf * idf

        results.append(score_map)

    return results


def top_terms_by_tfidf(corpus: list[str], top_k: int = 10) -> list[list[dict[str, float]]]:
    """Return top-k TF-IDF terms for each document."""
    all_scores = tfidf_scores(corpus)
    top_terms: list[list[dict[str, float]]] = []

    for score_map in all_scores:
        sorted_terms = sorted(score_map.items(), key=lambda x: x[1], reverse=True)[:top_k]
        top_terms.append(
            [{"term": term, "score": round(score, 6)} for term, score in sorted_terms]
        )

    return top_terms


# --- refer_dictionary 向け: 形態素解析済みトークンから直接ベクトルを算出する ---
# morphological_analysis を再度呼ばずに済むため、
# スレッドセーフ問題を回避しつつパフォーマンスも改善できる。

def vectorize_pretokenized_words(
    words: list[tuple[str, ...]],
    target_dim: int = 300,
) -> list[list[float]]:
    """形態素解析済みの単語タプルのリストからベクトルを算出する。

    Parameters
    ----------
    words : list[tuple[str, ...]]
        形態素解析済みの単語タプルのリスト。
    target_dim : int, optional
        出力ベクトルの次元数。DB の VECTOR カラムと一致させること。
        デフォルトは 300（DB の VECTOR(300) に対応）。

    Returns
    -------
    list[list[float]]
        各単語のベクトル。全て target_dim 次元で統一される。
    """
    if not words:
        return []

    nlp = _get_spacy_ja()

    # spaCy の語彙ベクトル次元を確認
    spacy_dim = 0
    if nlp is not None:
        spacy_dim = int(getattr(nlp.vocab, "vectors_length", 0) or 0)

    results: list[list[float]] = []

    for word_parts in words:
        # タプルを結合して1つの単語にする（例: ("機械", "学習") → "機械学習"）
        compound_word = "".join(word_parts)

        # 各形態素のベクトルを集めて平均する
        part_vectors: list[list[float]] = []

        for part in word_parts:
            vec = _get_vocab_vector(nlp, part)
            if vec:
                part_vectors.append(vec)

        if part_vectors:
            # 形態素ベクトルの平均で複合語ベクトルを算出
            avg = _average_vectors(part_vectors)
            # spaCy の次元が target_dim と異なる場合はパディング/切り詰め
            if len(avg) != target_dim:
                avg = _resize_vector(avg, target_dim)
            results.append(avg)
        else:
            # spaCy で取れなければハッシュベクトルにフォールバック
            # target_dim で生成するので DB と次元が一致する
            results.append(_build_hashed_vector(compound_word, target_dim))

    return results


def _resize_vector(vec: list[float], target_dim: int) -> list[float]:
    """ベクトルを target_dim に合わせてパディングまたは切り詰める。"""
    if len(vec) >= target_dim:
        return vec[:target_dim]
    return vec + [0.0] * (target_dim - len(vec))


def _get_vocab_vector(nlp: Any | None, word: str) -> list[float]:
    """spaCy の語彙からベクトルを取得する。トークナイザーは使わない。

    語彙辞書への直接アクセスのみを行うため、スレッドセーフ。
    """
    if nlp is None:
        return []

    lexeme = nlp.vocab[word]
    if lexeme.has_vector and float(lexeme.vector_norm) > 0.0:
        return [float(v) for v in lexeme.vector]

    return []

