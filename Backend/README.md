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

## Docker で起動

ルートディレクトリ（`/Users/honmayuudai/MyHobby/hackson/KC3Hack2026`）で実行してください。
ARM64 などで `sudachipy` の Linux wheel が無い場合でもビルドできるよう、Dockerfile には Rust ツールチェーンを含めています（初回ビルドは時間がかかる可能性があります）。

```bash
make up-backend
```

- API ベース URL: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 現在の API

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

- `POST /analysis/vectorize`
  - テキストを形態素解析し、品詞フィルタ後の語をベクトル化して返す
  - 既定では接続詞・助詞・助動詞・記号類を除外し、名詞/動詞/形容詞などを対象にする
  - リクエスト例:
    ```json
    {
      "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
      "deduplicate": false
    }
    ```
  - レスポンス例（抜粋）:
    ```json
    {
      "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
      "meta": {
        "model": "ja_ginza",
        "vector_dim": 300,
        "input_token_count": 16,
        "output_token_count": 4
      },
      "tokens": [
        {
          "surface": "自然言語処理",
          "base_form": "自然言語処理",
          "pos": "名詞",
          "vector_dim": 300
        }
      ]
    }
    ```

- `POST /dictionary/lookup`
  - 用語の意味を日本語で1〜2文の概要として返す
  - 現在は単語DB未実装のため、常にGeminiで生成する
  - リクエスト例:
    ```json
    {
      "term": "RAG",
      "context": "LLMの会話で出てきた用語"
    }
    ```
  - レスポンス例:
    ```json
    {
      "term": "RAG",
      "summary": "RAGは、回答生成時に外部知識を検索して根拠を補う手法です。LLMの回答精度を高める目的で使われます。",
      "source": "gemini",
      "model": "gemini-1.5-flash",
      "cached": false
    }
    ```

## ディレクトリ構成

```txt
Backend/
├── main.py
├── requirements.txt
└── app/
    ├── api/
    │   ├── __init__.py
    │   └── endpoints/
    │       ├── analysis.py
    │       ├── dictionary.py
    │       └── hoge.py
    ├── services/
    │   ├── dictionary.py
    │   ├── text_analysis.py
    │   └── hoge.py
    └── schemas/
        ├── analysis.py
        ├── dictionary.py
        └── hoge.py
```

## 今後の実装予定

- 形態素解析、係り受け解析による単語分割・重要語判定
- 類似度計算（`word2vec` など）による補助スコア
- Frontend と接続する本番用解析 API の定義と実装
