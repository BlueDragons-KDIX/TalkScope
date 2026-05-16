from __future__ import annotations

from typing import Any
from app.core.database import get_transaction_manager
from app.models.dictionary import InfoTable, TermTable
from app.schemas.dictionary import TermInfo
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

def _get_tx():
    tx = get_transaction_manager()
    if tx is None:
        raise RuntimeError("DB is not available")
    return tx

# ====================== INSERT ==========================

def insert_term_infos(term_infos: list[TermInfo]) -> None:
    """用語情報のリストをDBに保存する関数"""
    # dictionary_termsに用語を登録し、dictionary_infosに意味とベクトルを追加する
    def _insert(session: Session) -> None:
        # 単語を登録し、idを取得する
        new_terms = _onconflict_insert_terms(
            session,
            [
                {"term": info.term, "idf_wiki": getattr(info, "idf_wiki", None)}
                for info in term_infos
            ],
        )

        # 単語のidを外部キーとして意味情報とベクトルを登録する
        for new_term, info in zip(new_terms, term_infos, strict=True):
            new_info = [
                InfoTable(
                    term_id=new_term.id,
                    description=description,
                    meaning_vector=meaning_vector,
                ) for description, meaning_vector in info.definition_embeddings
            ]
            session.add_all(new_info)
        session.flush()
    _get_tx().run(_insert)


# コンフリクトが発生する可能性があるINSERT関数
def _onconflict_insert_terms(
        session: Session,
        row_dicts: list[dict[str, Any]], 
    ) -> list[TermTable]:
    """
    termを一意制約としたINSERT関数。
    同一termが既に存在する場合は、その行を更新する（ここではterm自体を更新するが、実質的には更新なし）。
    Args:
        session: DBセッション
        row_dicts: 挿入する行の辞書のリスト。!!!TermTableのカラムにキーを用いること!!
    Returns:
        挿入または更新されたTermTableの行のリスト。
    """
    stmt = insert(TermTable).values(row_dicts)
    stmt = stmt.on_conflict_do_update(
        index_elements=["term"], 
        set_ = {"term": stmt.excluded.term, "updated_at": stmt.excluded.updated_at},
    )
    result = session.scalars(stmt.returning(TermTable), execution_options={"populate_existing": True}).all()
    return result


# ====================== READ ==========================

def read_term_infos(terms: list[str]) -> list[TermInfo]:
    """
    用語情報を複数取得する関数
    Args:
        terms: 検索対象の用語リスト
    Returns:
        term_infos: 用語と、その意味説明・意味ベクトルのリスト
    """
    if not terms:
        return []

    # read呼び出し
    rows = read_term_info_rows(terms)

    # マッピング
    term_info_by_term: dict[str, TermInfo] = {}
    for term_row, info_row in rows:
        if term_row.term not in term_info_by_term:
            term_info_by_term[term_row.term] = TermInfo(term=term_row.term, definition_embeddings=[])
        term_info_by_term[term_row.term].definition_embeddings.append(
            (info_row.description, info_row.meaning_vector)
        )

    # 一定の日数で更新する
    return list(term_info_by_term.values())


def read_term_info_rows(terms: list[str]) -> list[tuple[TermTable, InfoTable]]:
    """
    用語情報のテーブル行を複数取得する関数
    Args:
        terms: 検索対象の用語リスト
    Returns:
        rows: 用語テーブル行と意味情報テーブル行のタプル
    """
    def _read(session: Session) -> list[tuple[TermTable, InfoTable]]:
        return (
            session.query(TermTable, InfoTable)
            .join(InfoTable, InfoTable.term_id == TermTable.id)
            .filter(TermTable.term.in_(terms))
            .order_by(TermTable.id.asc(), InfoTable.id.asc())
            .all()
        )

    return _get_tx().run(_read)
