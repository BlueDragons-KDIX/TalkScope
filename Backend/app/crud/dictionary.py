from app.models.dictionary import Dictionary
from sqlalchemy.orm import Session
from app.core.database import tx


def create_dictionary(
    word: str,
    meaning: str,
    description: str | None = None,
    meaning_vector: list[float] | None = None,
) -> int:
    """辞書エントリを作成し、生成されたIDを返す。"""

    def _create(session: Session) -> int:
        entry = Dictionary(
            word=word,
            meaning=meaning,
            description=description,
            meaning_vector=meaning_vector,
        )
        session.add(entry)
        session.flush()
        return entry.id
    return tx.run(_create)

def read_dictionary_by_word(word: str) -> Dictionary | None:
    """単語で辞書エントリを検索し、見つかったエントリを返す。"""
    def _read(session: Session) -> Dictionary | None:
        entry = session.query(Dictionary).filter(Dictionary.word == word).first()
        if entry:
            session.expunge(entry)  # セッションから切り離し、属性を保持
        return entry
    return tx.run(_read)

def update_dictionary(id: int, word: str, meaning: str, description: str | None = None, meaning_vector: list[float] | None = None) -> None:
    """辞書エントリを更新する。"""
    def _update(session: Session) -> None:
        entry = session.query(Dictionary).filter(Dictionary.id == id).first()
        if entry:
            entry.word = word
            entry.meaning = meaning
            entry.description = description
            entry.meaning_vector = meaning_vector
    return tx.run(_update)

def delete_dictionary(id: int) -> None:
    """辞書エントリを削除する。"""
    def _delete(session: Session) -> None:
        entry = session.query(Dictionary).filter(Dictionary.id == id).first()
        if entry:
            session.delete(entry)
    return tx.run(_delete)