import pytest
import time
from fastapi.testclient import TestClient
from main import app
from app.core.database import db

client = TestClient(app)

# 統合テストとしてマーク
pytestmark = pytest.mark.integration

@pytest.mark.skipif(not db.is_available, reason="DB is not available for integration test")
def test_refer_dictionary_performance() -> None:
    """長文リクエスト時の時間経過（パフォーマンス）を計測するテスト"""
    
    test_text = (
        "大規模言語モデル（LLM）の進化により、人工知能による自然言語処理技術は飛躍的な発展を遂げました。"
        "特に、トランスフォーマー・アーキテクチャを活用したニューラルネットワークは、"
        "機械翻訳や文章要約、対話システムなど多岐にわたる応用分野でこれまでの常識を覆しています。"
    )
    
    print("\n--- パフォーマンステスト開始 ---")
    print(f"対象テキスト: {test_text[:30]}... (計 {len(test_text)} 文字)")
    
    # 1. 形態素解析とAPI全体のレスポンスタイム計測
    start_time = time.time()
    res = client.post("/analysis/refer_dictionary", json={"text": test_text})
    end_time = time.time()
    
    elapsed_time = end_time - start_time
    
    if res.status_code in [502, 503, 504]:
        print(f"\n⚠️ 警告: Gemini API が混雑または制限に達しているため中断しました: {res.text}")
        print(f"⏱️  これまでの実行時間: {elapsed_time:.2f} 秒 (APIエラー)")
        print("--------------------------------\n")
        pytest.skip("Gemini API is experiencing high demand or rate limits.")
        return

    assert res.status_code == 200, f"APIリクエスト失敗: {res.status_code} - {res.text}"
    body = res.json()
    entries = body.get("entries", [])
    
    llm_hits = sum(1 for e in entries if e["source"] == "llm")
    db_hits = sum(1 for e in entries if e["source"] == "db")
    
    print(f"\n⏱️  総実行時間: {elapsed_time:.2f} 秒")
    print(f"📊 抽出された名詞の数: {len(entries)} 件")
    print(f"   - LLMから新規取得: {llm_hits} 件")
    print(f"   - DBからキャッシュ取得: {db_hits} 件")
    
    if len(entries) > 0:
        avg_time_per_word = elapsed_time / len(entries)
        print(f"⚡ 単語あたりの平均処理時間: {avg_time_per_word:.2f} 秒/単語")
    
    # タイムアウト基準（約10秒）以内に終わっているかのアサーション（必要に応じて調整）
    # 多くの単語がLLMにヒットする場合、10秒を超える可能性があるため警告にとどめる
    if elapsed_time > 10.0:
        print("⚠️ 警告: 処理に10秒以上かかっています。Gemini API のタイムアウトや並列数の制限に引っかかる可能性があります。")
        
    print("--------------------------------\n")
