from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.api.endpoints.dictionary as dictionary_endpoint
from main import app

client = TestClient(app)


def _entry(
    id: int,
    term: str,
    description: str,
    meaning_vector: list[float] | None = None,
):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=id,
        term=term,
        description=description,
        meaning_vector=meaning_vector if meaning_vector is not None else [0.1] * 300,
        created_at=now,
        updated_at=now,
    )


def test_dictionary_entries_list_returns_200(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_endpoint, "db", SimpleNamespace(is_available=True))
    monkeypatch.setattr(
        dictionary_endpoint,
        "list_dictionaries",
        lambda term_query, limit, offset: ([_entry(1, "RAG", "説明")], 1),
    )

    res = client.get("/dictionary/entries", params={"q": "RA", "limit": 20, "offset": 0})

    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["term"] == "RAG"


def test_dictionary_entries_list_returns_503_without_db(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_endpoint, "db", SimpleNamespace(is_available=False))
    res = client.get("/dictionary/entries")
    assert res.status_code == 503


def test_dictionary_entry_patch_returns_200(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_endpoint, "db", SimpleNamespace(is_available=True))
    monkeypatch.setattr(dictionary_endpoint, "read_dictionary_by_id", lambda _id: _entry(1, "old", "old desc"))
    monkeypatch.setattr(dictionary_endpoint, "read_dictionary_by_term", lambda _term: None)
    monkeypatch.setattr(dictionary_endpoint, "vectorize_pretokenized_words", lambda _words: [[0.2] * 300])
    monkeypatch.setattr(
        dictionary_endpoint,
        "update_dictionary",
        lambda id, term, description, meaning_vector: _entry(
            id,
            term or "old",
            description or "old desc",
            meaning_vector,
        ),
    )

    res = client.patch(
        "/dictionary/entries/1",
        json={"term": "RAG", "description": "更新後"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["term"] == "RAG"
    assert body["description"] == "更新後"


def test_dictionary_entry_patch_returns_409_on_duplicate(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_endpoint, "db", SimpleNamespace(is_available=True))
    monkeypatch.setattr(dictionary_endpoint, "read_dictionary_by_id", lambda _id: _entry(1, "old", "old desc"))
    monkeypatch.setattr(dictionary_endpoint, "read_dictionary_by_term", lambda _term: _entry(2, "RAG", "exists"))

    res = client.patch("/dictionary/entries/1", json={"term": "RAG"})

    assert res.status_code == 409
    assert res.json()["detail"] == "term already exists"


def test_dictionary_entry_delete_returns_204(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_endpoint, "db", SimpleNamespace(is_available=True))
    monkeypatch.setattr(dictionary_endpoint, "delete_dictionary", lambda _id: True)

    res = client.delete("/dictionary/entries/1")

    assert res.status_code == 204


def test_dictionary_entries_bulk_register_returns_created_and_skipped(monkeypatch) -> None:
    monkeypatch.setattr(dictionary_endpoint, "db", SimpleNamespace(is_available=True))

    def _mock_read_by_term(term: str):
        if term == "existing":
            return _entry(1, "existing", "既存")
        return None

    monkeypatch.setattr(dictionary_endpoint, "read_dictionary_by_term", _mock_read_by_term)
    monkeypatch.setattr(
        dictionary_endpoint,
        "lookup_term_summary",
        lambda term: {"term": term, "summary": f"{term}の説明"},
    )
    monkeypatch.setattr(dictionary_endpoint, "vectorize_pretokenized_words", lambda _words: [[0.3] * 300])
    monkeypatch.setattr(dictionary_endpoint, "create_dictionary", lambda **_kwargs: 2)
    monkeypatch.setattr(dictionary_endpoint, "read_dictionary_by_id", lambda _id: _entry(2, "new", "newの説明"))

    res = client.post(
        "/dictionary/entries/bulk",
        json={"raw_terms": "existing, new"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["requested_count"] == 2
    assert body["created_count"] == 1
    assert body["skipped_count"] == 1
