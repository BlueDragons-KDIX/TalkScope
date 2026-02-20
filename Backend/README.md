# Backend

LexiFlow のバックエンドです。FastAPI で API を提供し、将来的に NLP の重い解析処理を担います。

## 技術スタック

- Python
- uv
- FastAPI
- Uvicorn
- Pydantic

## セットアップ

```bash
cd Backend
uv sync
```

## 起動

```bash
uv run uvicorn main:app --reload
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
├── pyproject.toml
├── uv.lock
├── requirements.txt
└── app/
    ├── api/
    │   ├── __init__.py
    │   └── endpoints/
    │       └── hoge.py
    ├── services/
    │   └── hoge.py
    └── schemas/
        └── hoge.py
```

## 設計方針（小規模 FastAPI）

- `endpoints` は薄く保ち、リクエスト/レスポンスの受け渡しに集中させる
- 業務ロジックは `services` に寄せる
- `schemas` は API 入出力の型定義を担当する

## 補足

- 依存管理は `uv` を正とします
- `requirements.txt` は互換目的で残しています（新規依存追加時は `pyproject.toml` を更新）
- 詳細手順: `UV_GUIDE.md`

## 今後の実装予定

- 形態素解析、係り受け解析による単語分割・重要語判定
- 類似度計算（`word2vec` など）による補助スコア
- Frontend と接続する本番用解析 API の定義と実装
