from __future__ import annotations

from app.core.database import tx
from app.models.dictionary import Dictionary
from sqlalchemy.orm import Session


def create_dictionary(
    term: str,
    description: str,
    meaning_vector: list[float] | None = None,
) -> int:
    """辞書エントリを作成し、生成されたIDを返す。"""

    def _create(session: Session) -> int:
        entry = Dictionary(
            term=term,
            description=description,
            meaning_vector=meaning_vector,
        )
        session.add(entry)
        session.flush()
        return entry.id
    return tx.run(_create)


def read_dictionary_by_id(id: int) -> Dictionary | None:
    """IDで辞書エントリを取得する。"""

    def _read(session: Session) -> Dictionary | None:
        entry = session.query(Dictionary).filter(Dictionary.id == id).first()
        if entry:
            session.expunge(entry)
        return entry

    return tx.run(_read)


def read_dictionary_by_term(term: str) -> Dictionary | None:
    """用語で辞書エントリを検索し、見つかったエントリを返す。"""

    def _read(session: Session) -> Dictionary | None:
        entry = session.query(Dictionary).filter(Dictionary.term == term).first()
        if entry:
            session.expunge(entry)  # セッションから切り離し、属性を保持
        return entry

    return tx.run(_read)


def list_dictionaries(
    term_query: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[Dictionary], int]:
    """辞書エントリ一覧を取得し、総件数と合わせて返す。"""

    def _list(session: Session) -> tuple[list[Dictionary], int]:
        query = session.query(Dictionary)
        if term_query:
            query = query.filter(Dictionary.term.ilike(f"%{term_query}%"))

        total = query.count()
        rows = (
            query.order_by(Dictionary.updated_at.desc(), Dictionary.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        for row in rows:
            session.expunge(row)
        return rows, total

    return tx.run(_list)


def update_dictionary(
    id: int,
    term: str | None = None,
    description: str | None = None,
    meaning_vector: list[float] | None = None,
) -> Dictionary | None:
    """辞書エントリを更新し、更新後エントリを返す。"""

    def _update(session: Session) -> Dictionary | None:
        entry = session.query(Dictionary).filter(Dictionary.id == id).first()
        if not entry:
            return None
        if term is not None:
            entry.term = term
        if description is not None:
            entry.description = description
        if meaning_vector is not None:
            entry.meaning_vector = meaning_vector
        session.flush()
        session.expunge(entry)
        return entry

    return tx.run(_update)


def delete_dictionary(id: int) -> bool:
    """辞書エントリを削除する。削除できたらTrueを返す。"""

    def _delete(session: Session) -> bool:
        entry = session.query(Dictionary).filter(Dictionary.id == id).first()
        if not entry:
            return False
        session.delete(entry)
        return True

    return tx.run(_delete)
