from __future__ import annotations

from uuid import uuid4

import pytest
import dotenv

dotenv.load_dotenv()


from app.core.database import get_database
from app.crud.dictionary_v1 import _onconflict_insert_terms, insert_term_infos, read_term_infos
from app.models.dictionary import TermTable
from app.schemas.dictionary import TermInfo


db = get_database()


@pytest.mark.skipif(not db.is_available, reason="DEV_DATABASE_URL is not configured")
def test_onconflict_insert_terms_returns_existing_and_new_terms() -> None:
    """
    既存termと新規termを同時に渡してもunique違反にならず、
    既存行と新規行の両方が返ることを確認する。
    """
    db.define_tables()

    unique_suffix = uuid4().hex
    existing_term = f"test_existing_{unique_suffix}"
    new_term = f"test_new_{unique_suffix}"

    session = db.SessionLocal()
    try:
        existing_row = TermTable(term=existing_term, idf_wiki=None)
        session.add(existing_row)
        session.flush()
        existing_id = existing_row.id

        rows = _onconflict_insert_terms(
            session=session,
            row_dicts=[
                {"term": existing_term, "idf_wiki": None},
                {"term": new_term, "idf_wiki": None},
            ],
        )
        session.flush()

        row_by_term = {row.term: row for row in rows}
        assert set(row_by_term) == {existing_term, new_term}
        assert row_by_term[existing_term].id == existing_id
        assert row_by_term[new_term].id is not None

        for term in (existing_term, new_term):
            count = session.query(TermTable).filter(TermTable.term == term).count()
            assert count == 1
    finally:
        session.rollback()
        session.close()


@pytest.mark.skipif(not db.is_available, reason="DEV_DATABASE_URL is not configured")
def test_insert_term_infos_commits_terms_and_definitions_to_dev_db() -> None:
    """
    insert_term_infosがdev DBへtermと複数の意味情報を保存し、
    read_term_infosで読み戻せることを確認する。
    """
    db.define_tables()

    unique_suffix = uuid4().hex
    term = f"test_insert_term_infos_{unique_suffix}"
    definitions = [
        ("テスト用の意味説明1", [0.1] * 300),
        ("テスト用の意味説明2", [0.2] * 300),
    ]

    insert_term_infos([
        TermInfo(term=term, idf_wiki=None, description_embeddings=definitions)
    ])

    term_infos = read_term_infos([term])
    print("\n[read_term_infos result]")
    for term_info in term_infos:
        print(f"term={term_info.term}, idf_wiki={term_info.idf_wiki}")
        for description, vector in term_info.description_embeddings:
            print(
                f"  description={description}, "
                f"vector_dim={len(vector)}, vector_head={float(vector[0])}"
            )

    assert len(term_infos) == 1
    assert term_infos[0].term == term
    assert len(term_infos[0].description_embeddings) == 2

    returned_definitions = term_infos[0].description_embeddings
    assert {description for description, _vector in returned_definitions} == {
        "テスト用の意味説明1",
        "テスト用の意味説明2",
    }
    assert sorted(round(float(vector[0]), 1) for _description, vector in returned_definitions) == [0.1, 0.2]
