"""用語スコアの **IDF バフ**用データを読み込み、プロセス内で共有する。

**DB を参照する理由**
    語ごとの IDF は大量になり得るので、運用ではDBの term_idf に保持しバッチや管理画面から更新しやすくする。
    **リクエストのたびに DB を叩くのではなく**、アプリ起動時に 1 度だけ読み
    （環境変数 ``TERM_IDF_LOAD_MIN_VALUE`` があれば **その IDF 以上の語のみ** に間引いて）、
    ``IdfLookupTable`` に載せてメモリ参照のみにする（ ``POST /analysis/score/terms`` のレイテンシ用）。

**データの意味**
    外部コーパスから事前計算した語のスカラー。
    **会話ログの類度とは別軸**で、スコア上は ``compute_term_score_additive`` の ``idf_scaled`` にだけ効く。

**読み込み優先順位**
    term_idf が1行でもあればDBを使用。それ以外では開発向けに IDF_JSON_PATH の JSONを使用する。
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from sqlalchemy import select

from app.core.database import get_database
from app.models.term_idf import TermIdf
from app.services.score_building_blocks import IdfLookupTable, load_idf_table_from_json

_logger = logging.getLogger(__name__)

_table: IdfLookupTable | None = None

db = get_database()

def _term_idf_load_min_value_from_env() -> float | None:
    """読み込み対象とする下限 IDF（``TERM_IDF_LOAD_MIN_VALUE``）。未設定または不正なら ``None``＝下限なし。"""
    raw = os.getenv("TERM_IDF_LOAD_MIN_VALUE", "").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        _logger.warning("TERM_IDF_LOAD_MIN_VALUE が数値として解釈できません（下限なしで全件）: %s", raw)
        return None


def _load_idf_lookup_from_database() -> IdfLookupTable | None:
    """DB の ``term_idf`` を SELECT し、``IdfLookupTable`` に変換する。

    ``TERM_IDF_LOAD_MIN_VALUE`` 設定時は ``idf_value >= その値`` の行だけ読む。
    サーバ運用での IDF マスタの正とし、キーは形態素基本形 ``lemma`` と API と揃える。
    """
    if not db.is_available or db.SessionLocal is None:
        return None

    session = db.SessionLocal()
    try:
        min_v = _term_idf_load_min_value_from_env()
        stmt = select(TermIdf.lemma, TermIdf.idf_value)
        if min_v is not None:
            stmt = stmt.where(TermIdf.idf_value >= min_v)
        pairs: dict[str, float] = {}
        result = session.execute(stmt)
        for lemma, raw in result:
            pairs[str(lemma)] = float(raw)
        if not pairs:
            # _logger.info(
            #     "term_idf に該当行がありません（下限 IDF フィルタ後または空）。IDF は DB 経由では有効になりません"
            # )
            return None
        if min_v is not None:
            pass
            # _logger.info("term_idf を idf_value >= %s で %d 語読み込みました", min_v, len(pairs))
        return IdfLookupTable(pairs)
    except Exception:
        _logger.exception("term_idf から IDF を読み込めませんでした")
        return None
    finally:
        session.close()


def _load_idf_lookup_from_env_json_file() -> IdfLookupTable | None:
    """環境変数 ``IDF_JSON_PATH`` の JSON を読み ``IdfLookupTable`` にするフォールバック。

    DB 側と同様、``TERM_IDF_LOAD_MIN_VALUE`` がセットされていれば **その値以上の語だけ**
    が ``load_idf_table_from_json(..., min_idf=...)`` 経由で残る。
    DB に該当行が無いときや接続できないときの開発用であり、運用優先順位は ``init_idf_table`` のとおり DB 先である。
    """
    raw = os.getenv("IDF_JSON_PATH", "").strip()
    if not raw:
        return None

    path = Path(raw)
    if not path.is_file():
        _logger.warning("IDF_JSON_PATH がファイルを指していません: %s", raw)
        return None

    try:
        return load_idf_table_from_json(path, min_idf=_term_idf_load_min_value_from_env())
    except Exception:
        _logger.exception("IDF JSON の読み込みに失敗しました: %s", raw)
        return None


def init_idf_table() -> None:
    """アプリ lifespan から 1 回呼び、シングルトン ``_table`` を設定するエントリ。

    順に DB→JSON を試す。結果は ``get_idf_table()`` 経由で用語スコア計算に渡る。
    """
    global _table
    _table = None

    tbl = _load_idf_lookup_from_database()
    if tbl is not None:
        _table = tbl
        # _logger.info("IDF は DB の term_idf から読み込みました")
        return

    tbl_json = _load_idf_lookup_from_env_json_file()
    if tbl_json is not None:
        _table = tbl_json
        # _logger.info("IDF は IDF_JSON_PATH のファイルから読み込みました")
        return

    # _logger.info("IDF データなしのためスコアに IDF バフは使いません（term_idf 空・無効および IDF_JSON_PATH なし／失敗）")


def get_idf_table() -> IdfLookupTable | None:
    """起動時ロード済みの IDF テーブル。無い場合 ``None``（``idf_weight > 0`` でもバフは付かない）。"""
    return _table
