import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from app.schemas.analysis import ReferDictionaryEntry


client = TestClient(app)

# ---------------------------------------------------------------------------
# モック用のダミーデータ
# ---------------------------------------------------------------------------
DUMMY_VECTOR = [0.1] * 300


@pytest.fixture(autouse=True)
def mock_external_services():
    """LLM と DB の呼び出しをモック化する"""
    with patch("app.services.refer_dictionary.read_dictionary_by_term") as mock_read, \
         patch("app.services.refer_dictionary.create_dictionary") as mock_create, \
         patch("app.services.refer_dictionary.lookup_term_summary") as mock_lookup, \
         patch("app.services.refer_dictionary.db") as mock_db:

        # デフォルトでDBは有効扱い
        mock_db.is_available = True
        
        # DB は基本的に Miss を返す (None) -> 必要なテストで上書きする
        mock_read.return_value = None
        
        # DB Insert時のダミー戻り値
        mock_create.return_value = 1
        
        # LLM は常にダミー結果を返す
        mock_lookup.side_effect = lambda term: {
            "summary": f"モックされた {term} の説明です",
        }

        yield {
            "read": mock_read,
            "create": mock_create,
            "lookup": mock_lookup,
            "db": mock_db
        }


# ---------------------------------------------------------------------------
# テストケース
# ---------------------------------------------------------------------------

def test_refer_dictionary_single_noun(mock_external_services) -> None:
    """単一名詞のテスト（正常系）"""
    res = client.post(
        "/analysis/refer_dictionary",
        json={"text": "犬が好きです"},
    )
    assert res.status_code == 200
    body = res.json()
    
    assert body["text"] == "犬が好きです"
    assert "entries" in body
    assert len(body["entries"]) == 1
    
    first = body["entries"][0]
    assert first["term"] == "犬"
    assert "モックされた 犬 の説明" in first["description"]
    assert first["meaning_vector"] is not None
    assert len(first["meaning_vector"]) == 300
    assert first["source"] == "llm"  # デフォルトでは DB miss なので LLM からの取得になる
    
    # 外部API/DBが正しく呼ばれたか検証
    mock_external_services["read"].assert_called_with("犬")
    mock_external_services["lookup"].assert_called_with("犬")
    mock_external_services["create"].assert_called_once()


def test_refer_dictionary_compound_noun(mock_external_services) -> None:
    """複合名詞のテスト（正常系）"""
    res = client.post(
        "/analysis/refer_dictionary",
        json={"text": "自然言語処理を学ぶ"},
    )
    assert res.status_code == 200
    body = res.json()
    entries = body["entries"]
    
    assert len(entries) >= 1
    assert any("自然言語処理" in e["term"] for e in entries)


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


def test_refer_dictionary_no_nouns() -> None:
    """名詞が含まれないテキスト（エッジケース）"""
    res = client.post("/analysis/refer_dictionary", json={"text": "とても速く走る"})
    assert res.status_code == 200
    body = res.json()
    assert body["entries"] == []


def test_refer_dictionary_empty_text() -> None:
    """空の場合のバリデーション（エラー期待）"""
    res = client.post("/analysis/refer_dictionary", json={"text": ""})
    assert res.status_code == 422


def test_refer_dictionary_whitespace_text() -> None:
    """空白のみのバリデーション（エラー期待）"""
    res = client.post("/analysis/refer_dictionary", json={"text": "   "})
    assert res.status_code == 422


def test_refer_dictionary_cached_noun(mock_external_services) -> None:
    """DBヒット時の挙動（LLMが呼ばれないこと）のテスト"""
    # モックのDB(read)が常に「りんご」のエントリを返すように設定する
    mock_entry = MagicMock()
    mock_entry.term = "りんご"
    mock_entry.description = "DBから取得されたりんごの説明"
    mock_entry.meaning_vector = DUMMY_VECTOR
    mock_external_services["read"].return_value = mock_entry

    res = client.post("/analysis/refer_dictionary", json={"text": "りんご"})
    assert res.status_code == 200
    entries = res.json()["entries"]
    
    assert len(entries) == 1
    first = entries[0]
    assert first["term"] == "りんご"
    assert first["source"] == "db"
    assert first["description"] == "DBから取得されたりんごの説明"

    # LLMの問い合わせやDB登録が行われていないか検証
    mock_external_services["lookup"].assert_not_called()
    mock_external_services["create"].assert_not_called()


def test_refer_dictionary_db_unavailable(mock_external_services) -> None:
    """DBが無効な場合のフォールバックテスト"""
    # DBを無効化
    mock_external_services["db"].is_available = False

    res = client.post("/analysis/refer_dictionary", json={"text": "犬"})
    assert res.status_code == 200
    entries = res.json()["entries"]
    
    assert len(entries) == 1
    assert entries[0]["term"] == "犬"
    assert entries[0]["source"] == "llm"

    # DB関数の呼び出しがスキップされ、LLMが叩かれていることを検証
    mock_external_services["read"].assert_not_called()
    mock_external_services["create"].assert_not_called()
    mock_external_services["lookup"].assert_called_with("犬")


def test_refer_dictionary_db_read_error_fallback(mock_external_services) -> None:
    """DB readで例外が出てもLLMフォールバックで200を返す。"""
    mock_external_services["read"].side_effect = RuntimeError("db read failed")

    res = client.post("/analysis/refer_dictionary", json={"text": "犬"})
    assert res.status_code == 200

    entries = res.json()["entries"]
    assert len(entries) == 1
    assert entries[0]["term"] == "犬"
    assert entries[0]["source"] == "llm"

    mock_external_services["lookup"].assert_called_with("犬")


def test_refer_dictionary_db_create_error_fallback(mock_external_services) -> None:
    """DB createで例外が出てもLLM結果を返し500にしない。"""
    mock_external_services["read"].return_value = None
    mock_external_services["create"].side_effect = RuntimeError("db write failed")

    res = client.post("/analysis/refer_dictionary", json={"text": "犬"})
    assert res.status_code == 200

    entries = res.json()["entries"]
    assert len(entries) == 1
    assert entries[0]["term"] == "犬"
    assert entries[0]["source"] == "llm"

    mock_external_services["lookup"].assert_called_with("犬")
