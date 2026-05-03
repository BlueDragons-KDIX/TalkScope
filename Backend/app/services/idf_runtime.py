"""用語スコア用 IDF をプロセス内で共有するシングルトン。

優先順位は **DB の ``term_idf``**（1 語 1 行）、次いで開発用フォールバックの **JSON**（``IDF_JSON_PATH``）。
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from sqlalchemy import select

from app.core.database import db
from app.models.term_idf import TermIdf
from app.services.score_building_blocks import IdfLookupTable, load_idf_table_from_json

_logger = logging.getLogger(__name__)

_table: IdfLookupTable | None = None


def _load_idf_lookup_from_database() -> IdfLookupTable | None:
    """``term_idf`` にデータがあれば ``IdfLookupTable`` にする。"""
    if not db.is_available or db.SessionLocal is None:
        return None

    session = db.SessionLocal()
    try:
        stmt = select(TermIdf.lemma, TermIdf.idf_value)
        pairs: dict[str, float] = {}
        result = session.execute(stmt)
        for lemma, raw in result:
            pairs[str(lemma)] = float(raw)
        if not pairs:
            _logger.info("term_idf に行がありません。IDF は DB 経由では有効になりません")
            return None
        return IdfLookupTable(pairs)
    except Exception:
        _logger.exception("term_idf から IDF を読み込めませんでした")
        return None
    finally:
        session.close()


def _load_idf_lookup_from_env_json_file() -> IdfLookupTable | None:
    raw = os.getenv("IDF_JSON_PATH", "").strip()
    if not raw:
        return None

    path = Path(raw)
    if not path.is_file():
        _logger.warning("IDF_JSON_PATH がファイルを指していません: %s", raw)
        return None

    try:
        return load_idf_table_from_json(path)
    except Exception:
        _logger.exception("IDF JSON の読み込みに失敗しました: %s", raw)
        return None


def init_idf_table() -> None:
    """起動時に IDF を 1 度だけ読む（DB を優先、なければ ``IDF_JSON_PATH``）。

    DB 未取得・テーブル空・失敗時は JSON を試み、両方無効なら ``None`` にし IDF バフは使わない。
    """
    global _table
    _table = None

    tbl = _load_idf_lookup_from_database()
    if tbl is not None:
        _table = tbl
        _logger.info("IDF は DB の term_idf から読み込みました")
        return

    tbl_json = _load_idf_lookup_from_env_json_file()
    if tbl_json is not None:
        _table = tbl_json
        _logger.info("IDF は IDF_JSON_PATH のファイルから読み込みました")
        return

    _logger.info("IDF データなしのためスコアに IDF バフは使いません（term_idf 空・無効および IDF_JSON_PATH なし／失敗）")


def init_idf_table_from_env() -> None:
    """:meth:`init_idf_table` の別名。"""
    init_idf_table()


def get_idf_table() -> IdfLookupTable | None:
    """読み込み済みテーブルを返す。"""
    return _table
