import pytest
import os
from fastapi.testclient import TestClient

from main import app
from app.crud.dictionary import read_dictionary_by_term, delete_dictionary
from app.core.database import db

# 統合テストは外部環境（DB, LLM）に依存するため、マークをつけて分離する
pytestmark = pytest.mark.integration

client = TestClient(app)

def _cleanup_test_data(terms: list[str]) -> None:
    """テストで作成されたDBデータをクリーンアップする"""
    if not db.is_available:
        return
    for term in terms:
        entry = read_dictionary_by_term(term)
        if entry:
            delete_dictionary(entry.id)


@pytest.mark.skipif(not db.is_available, reason="DB is not available for integration test")
def test_integration_refer_dictionary_live() -> None:
    """実際のDBとLLM（Gemini API）を通した結合テスト"""
    
    test_text = "自動テスト対象の統合システム"
    # 前回のゴミが残っていたら消す
    _cleanup_test_data(["自動テスト", "対象", "統合システム"])

    # 1回目のリクエスト (LLM を叩いて DB に保存する)
    res1 = client.post("/analysis/refer_dictionary", json={"text": test_text})
    assert res1.status_code == 200, "1回目のリクエストに失敗しました（LLMタイムアウトの可能性あり）"
    entries1 = res1.json()["entries"]
    
    assert len(entries1) >= 1
    # 最低1つはLLMから取得されていること
    assert any(e["source"] == "llm" for e in entries1)
    
    # 2回目のリクエスト (DBから即座に返却されること)
    res2 = client.post("/analysis/refer_dictionary", json={"text": test_text})
    assert res2.status_code == 200
    entries2 = res2.json()["entries"]
    
    assert len(entries2) >= 1
    # 2回目はDBから取得されていること
    assert any(e["source"] == "db" for e in entries2)
    
    # DBをクリーンアップ
    _cleanup_test_data([e["term"] for e in entries1 if e["source"] == "llm"])
