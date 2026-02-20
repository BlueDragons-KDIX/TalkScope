# Backend

LexiFlow のバックエンドです。FastAPI で API を提供し、将来的に NLP の重い解析処理を担います。

## 技術スタック

- Python
- FastAPI
- Uvicorn
- Pydantic

## セットアップ

```bash
cd Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 起動

```bash
uvicorn main:app --reload
```

- API ベース URL: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## 現在の API（初期実装）

- `GET /`
  - 疎通確認用
  - レスポンス例: `{"Hello": "World"}`

- `GET /hoge/`
  - サンプルエンドポイント
  - レスポンス例: `{"Hello": "Hoge"}`

- `POST /hoge/`
  - サンプル入力を受け取るエンドポイント
  - リクエスト例: `{"message": "test"}`
  - レスポンス例: `{"Hello": "test"}`

## ディレクトリ構成

```txt
Backend/
├── main.py
├── requirements.txt
└── app/
    ├── api/
    │   ├── __init__.py
    │   └── endpoints/
    │       └── hoge.py
    └── schemas/
        └── hoge.py
```

## 今後の実装予定

- 形態素解析、係り受け解析による単語分割・重要語判定
- 類似度計算（`word2vec` など）による補助スコア
- Frontend と接続する本番用解析 API の定義と実装
