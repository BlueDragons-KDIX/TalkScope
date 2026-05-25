from __future__ import annotations

from typing import Any
from app.core.database import get_transaction_manager
from app.models.dictionary import InfoTable, TermTable
from app.schemas.dictionary import TermInfo

from sqlalchemy import RowMapping, select
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
                ) for description, meaning_vector in info.description_embeddings
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
    # read呼び出し
    rows: list[RowMapping] = read_term_info_rows(terms)
    # TermInfoにマッピング
    term_info_dict: dict[int, TermInfo] = {}
    for row in rows:
        term_id = row["term_id"]
        if term_id not in term_info_dict:
            term_info_dict[term_id] = TermInfo(
                term=row["term"], 
                idf_wiki=row["idf_wiki"],
                description_embeddings=[]
            )
        term_info_dict[term_id].description_embeddings.append(
            (row["description"], row["meaning_vector"])
        )
    # TODO: 【検討】最終更新日が古いものは、もう一度意味生成を行うような処理を入れるべきか？（意味生成の精度向上のため）
    pass
    return list(term_info_dict.values())


def read_term_info_rows(terms: list[str]) -> list[RowMapping]:
    """
    用語情報のテーブル行を複数取得する関数
    Args:
        terms: 検索対象の用語リスト
    Returns:
        rows: 用語テーブル行と意味情報テーブル行の辞書のリスト
    """
    def _read(session: Session) -> list[RowMapping]:
        stmt = (
            select(
                TermTable.id.label("term_id"),
                TermTable.term,
                TermTable.idf_wiki,
                InfoTable.description,
                InfoTable.meaning_vector,
                TermTable.updated_at,
                TermTable.created_at,
            )
            .join(InfoTable, TermTable.id == InfoTable.term_id)
            .where(TermTable.term.in_(terms))
        )
        return session.execute(stmt).mappings().all()
    return _get_tx().run(_read)
