"""辞書参照サービス。

処理の流れ:
  1. テキストを形態素解析し、連続する名詞を複合語として抽出する
  2. 抽出した全単語を asyncio.gather で並列処理する
  3. 各単語の処理:
     a. DB検索 → ヒットすればその結果を返す
     b. ミスした場合、ベクトル化と LLM 問い合わせを並列実行する
     c. 得られた説明・ベクトルを DB に登録して返す

  テキスト
    │
    ▼
  形態素解析 (_extract_search_targets)
    │
    ▼
  複合名詞のリスト ──── 各単語を並列処理 (_lookup_or_create)
                          │
                          ├─ DB検索 ─── hit ──▶ 結果を返す
                          │
                          └─ miss
                              │
                              ├─ ベクトル化 (vectorize_pretokenized_words)  ┐
                              │                                             ├─ 並列
                              └─ LLM問い合わせ (lookup_term_summary)        ┘
                                          │
                                          ▼
                                   DB登録 (Semaphore で直列化)
                                          │
                                          ▼
                                       結果を返す
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, TypedDict

from app.services.text_analysis import morphological_analysis, vectorize_pretokenized_words
from app.services.dictionary import lookup_term_summary
from app.crud.dictionary import read_dictionary_by_term, create_dictionary
from app.core.database import db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DB 書き込み直列化セマフォ（遅延初期化）
# ---------------------------------------------------------------------------
_DB_SEM: asyncio.Semaphore | None = None


def _get_db_sem() -> asyncio.Semaphore:
    """イベントループに安全な遅延初期化でセマフォを返す。"""
    global _DB_SEM
    if _DB_SEM is None:
        _DB_SEM = asyncio.Semaphore(1)
    return _DB_SEM


# ---------------------------------------------------------------------------
# 戻り値の型定義
# ---------------------------------------------------------------------------
class DictionaryEntry(TypedDict):
    term: str
    description: str
    meaning_vector: list[float] | None
    source: str


# ---------------------------------------------------------------------------
# 公開 API
# ---------------------------------------------------------------------------
async def refer_dictionary(text: str) -> list[DictionaryEntry]:
    """テキスト中の名詞を辞書検索し、結果を返す。"""
    search_targets = _extract_search_targets(text)
    if not search_targets:
        return []

    tasks = [_lookup_or_create(term_parts) for term_parts in search_targets]
    results = await asyncio.gather(*tasks)

    return [r for r in results if r is not None]


# ---------------------------------------------------------------------------
# 単語ごとの処理
# ---------------------------------------------------------------------------
async def _lookup_or_create(
    term_parts: tuple[str, ...],
) -> DictionaryEntry | None:
    """1単語の処理: DB検索 → [ベクトル化 + LLM] → DB登録"""
    compound_term = "".join(term_parts)

    # 1. DB検索
    entry = None
    if db.is_available:
        try:
            entry = await asyncio.to_thread(read_dictionary_by_term, compound_term)
        except Exception:
            logger.exception("DB検索に失敗したためLLMへフォールバック: term=%s", compound_term)
            entry = None

    if entry:
        return DictionaryEntry(
            term=entry.term,
            description=entry.description,
            meaning_vector=entry.meaning_vector,
            source="db",
        )

    # 2. ベクトル化 + LLM を並列実行（DB を触らないので並列OK）
    vector_task = asyncio.to_thread(vectorize_pretokenized_words, [term_parts])
    llm_task = asyncio.to_thread(lookup_term_summary, compound_term)
    vectors, llm_result = await asyncio.gather(vector_task, llm_task)
    vector = vectors[0] if vectors else []
    description = llm_result["summary"]

    # 3. DB登録（直列: 書き込み衝突防止）
    #    UNIQUE 制約違反は並列処理で同じ単語が同時に miss した場合に発生する。
    #    その場合は既存エントリを返す。
    if db.is_available:
        async with _get_db_sem():
            try:
                await asyncio.to_thread(
                    create_dictionary,
                    term=compound_term,
                    description=description,
                    meaning_vector=vector,
                )
            except Exception:
                # UNIQUE 違反などで登録に失敗した場合は既存行を読み直す。
                # 読み直しにも失敗した場合はLLM結果を返し、API全体は継続させる。
                logger.exception("DB登録に失敗したため読み直しを試行: term=%s", compound_term)
                try:
                    entry = await asyncio.to_thread(read_dictionary_by_term, compound_term)
                except Exception:
                    logger.exception("DB再読込にも失敗したためLLM結果を返却: term=%s", compound_term)
                    entry = None
                if entry:
                    return DictionaryEntry(
                        term=entry.term,
                        description=entry.description,
                        meaning_vector=entry.meaning_vector,
                        source="db",
                    )

    return DictionaryEntry(
        term=compound_term,
        description=description,
        meaning_vector=vector,
        source="llm",
    )


# ---------------------------------------------------------------------------
# 形態素解析 → 検索対象抽出
# ---------------------------------------------------------------------------
_TARGET_POS = frozenset(("名詞",))


def _extract_search_targets(text: str) -> list[tuple[str, ...]]:
    """テキストから連続する名詞を複合語としてタプルにする。"""
    tokens = morphological_analysis(text)
    if not tokens:
        return []

    search_targets: list[tuple[str, ...]] = []
    noun_buffer: list[str] = []

    for token in tokens:
        if token["pos"] in _TARGET_POS:
            noun_buffer.append(token["surface"])
        elif noun_buffer:
            search_targets.append(tuple(noun_buffer))
            noun_buffer.clear()

    # 末尾のバッファをフラッシュ
    if noun_buffer:
        search_targets.append(tuple(noun_buffer))

    return search_targets
