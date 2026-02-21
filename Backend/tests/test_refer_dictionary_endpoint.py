import pytest
from fastapi.testclient import TestClient

from main import app
from app.crud.dictionary import read_dictionary_by_term, delete_dictionary


client = TestClient(app)

# テストで作成したデータをクリーンアップするためのヘルパー
def _cleanup_test_data(terms: list[str]) -> None:
    for term in terms:
        entry = read_dictionary_by_term(term)
        if entry:
            delete_dictionary(entry.id)


def test_refer_dictionary_single_noun() -> None:
    """単一名詞のテスト（正常系）"""
    res = client.post(
        "/analysis/refer_dictionary",
        json={"text": "犬が好きです"},
    )
    assert res.status_code == 200
    body = res.json()
    
    assert body["text"] == "犬が好きです"
    assert "entries" in body
    assert len(body["entries"]) >= 1
    
    first = body["entries"][0]
    assert "term" in first
    assert "description" in first
    assert "meaning_vector" in first
    assert "source" in first
    assert first["meaning_vector"] is not None
    assert len(first["meaning_vector"]) == 300
    
    _cleanup_test_data([e["term"] for e in body["entries"] if e["source"] == "llm"])


def test_refer_dictionary_compound_noun() -> None:
    """複合名詞のテスト（正常系）"""
    res = client.post(
        "/analysis/refer_dictionary",
        json={"text": "自然言語処理を学ぶ"},
    )
    assert res.status_code == 200
    body = res.json()
    entries = body["entries"]
    
    assert len(entries) >= 1
    # 複合名詞が結合されて取得できるか
    assert any("自然言語処理" in e["term"] for e in entries)
    
    _cleanup_test_data([e["term"] for e in body["entries"] if e["source"] == "llm"])


def test_refer_dictionary_multiple_nouns() -> None:
    """複数の名詞を持つ文章のテスト（正常系）"""
    res = client.post(
        "/analysis/refer_dictionary",
        json={"text": "PythonとFastAPIを使ってバックエンドサーバーを構築する"},
    )
    assert res.status_code == 200
    body = res.json()
    entries = body["entries"]
    
    assert len(entries) >= 2
    
    _cleanup_test_data([e["term"] for e in body["entries"] if e["source"] == "llm"])


def test_refer_dictionary_no_nouns() -> None:
    """名詞が含まれないテキスト（エッジケース）"""
    res = client.post("/analysis/refer_dictionary", json={"text": "とても速く走る"})
    assert res.status_code == 200
    body = res.json()
    
    assert body["entries"] == []


def test_refer_dictionary_long_text() -> None:
    """長文のテスト（正常系）"""
    res = client.post(
        "/analysis/refer_dictionary",
        json={"text": "人工知能と機械学習の分野において、基盤モデルの重要性が増しています。"},
    )
    assert res.status_code == 200
    body = res.json()
    entries = body["entries"]
    
    assert len(entries) >= 3
    
    _cleanup_test_data([e["term"] for e in body["entries"] if e["source"] == "llm"])


def test_refer_dictionary_empty_text() -> None:
    """空の場合のバリデーション（エラー期待）"""
    res = client.post("/analysis/refer_dictionary", json={"text": ""})
    assert res.status_code == 422


def test_refer_dictionary_whitespace_text() -> None:
    """空白のみのバリデーション（エラー期待）"""
    res = client.post("/analysis/refer_dictionary", json={"text": "   "})
    assert res.status_code == 422
