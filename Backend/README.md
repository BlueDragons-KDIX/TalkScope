# Backend

FastAPI を使用したバックエンドサーバーです。

## セットアップ

### 1. 仮想環境の作成・有効化

```bash
# 仮想環境の作成（初回のみ）
python -m venv venv

# 有効化
source venv/bin/activate
```

### 2. パッケージのインストール

```bash
pip install -r requirements.txt
```

## サーバーの起動

```bash
uvicorn main:app --reload
```

- デフォルトで `http://127.0.0.1:8000` で起動します
- `--reload` を付けるとコード変更時に自動リロードされます

## API ドキュメント

サーバー起動後、以下の URL で自動生成されたドキュメントを確認できます。

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
