"""``idf_runtime`` の起動時ロード（DB 優先・JSON フォールバックの単体テスト）。

以下でテスト可能: ``PYTHONPATH=. uv run pytest tests/test_idf_runtime.py``
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.services import idf_runtime
from app.services.score_building_blocks import IdfLookupTable


def test_init_prefers_database_over_json(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    p = tmp_path / "idf.json"
    p.write_text(json.dumps({"ファイル語": 9.99}), encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))

    db_table = IdfLookupTable({"db語": 1.5})
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: db_table)

    idf_runtime.init_idf_table()
    t = idf_runtime.get_idf_table()
    assert t is db_table
    assert t.lookup("db語") == pytest.approx(1.5)


def test_fallback_to_json_when_db_has_no_lexicon(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    p = tmp_path / "idf.json"
    p.write_text(json.dumps({"a": 2.0}), encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))
    idf_runtime.init_idf_table()
    assert idf_runtime.get_idf_table() is not None
    assert idf_runtime.get_idf_table().lookup("a") == pytest.approx(2.0)


def test_init_json_load(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    p = tmp_path / "idf.json"
    p.write_text(json.dumps({"猫": 2.5, "犬": 1.0}), encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))
    idf_runtime.init_idf_table()
    table = idf_runtime.get_idf_table()
    assert table is not None
    assert table.lookup("猫") == pytest.approx(2.5)


def test_init_clears_when_unset(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    p = tmp_path / "idf.json"
    p.write_text(json.dumps({"a": 1.0}), encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))
    idf_runtime.init_idf_table()
    assert idf_runtime.get_idf_table() is not None

    monkeypatch.delenv("IDF_JSON_PATH", raising=False)
    idf_runtime.init_idf_table()
    assert idf_runtime.get_idf_table() is None


def test_init_missing_json_file(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    monkeypatch.setenv("IDF_JSON_PATH", "/nonexistent/idf.json")
    idf_runtime.init_idf_table()
    assert idf_runtime.get_idf_table() is None


def test_init_invalid_json(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    p = tmp_path / "bad.json"
    p.write_text("not json", encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))
    idf_runtime.init_idf_table()
    assert idf_runtime.get_idf_table() is None


def test_json_skips_below_min_idf(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    monkeypatch.setenv("TERM_IDF_LOAD_MIN_VALUE", "2.5")
    p = tmp_path / "idf.json"
    p.write_text(json.dumps({"低": 0.5, "高": 4.0, "ギリ": 2.5}), encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))
    idf_runtime.init_idf_table()
    t = idf_runtime.get_idf_table()
    assert t is not None
    assert t.lookup("高") == pytest.approx(4.0)
    assert t.lookup("ギリ") == pytest.approx(2.5)


def test_json_min_idf_filters_all_yields_none(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(idf_runtime, "_load_idf_lookup_from_database", lambda: None)
    monkeypatch.setenv("TERM_IDF_LOAD_MIN_VALUE", "100")
    p = tmp_path / "idf.json"
    p.write_text(json.dumps({"a": 1.0}), encoding="utf-8")
    monkeypatch.setenv("IDF_JSON_PATH", str(p))
    idf_runtime.init_idf_table()
    assert idf_runtime.get_idf_table() is None
