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
cp .env.example .env
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
`docker-compose.yml` では `Backend` をデフォルトで `linux/amd64` で起動し、依存の wheel を優先利用します。
必要に応じて `BACKEND_PLATFORM=linux/arm64` のように上書き可能です。

```bash
make up-backend
```

初回や Dockerfile 更新後に再ビルドしたい場合:

```bash
make up-backend-build
```

Docker の build cache が溜まって容量不足になった場合:

```bash
make docker-clean
```

- API ベース URL: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Cloud Run デプロイ

Cloud Run へのデプロイ手順は以下を参照してください。

- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/doc/cloud-run-deploy-workflow.md`
- 自動デプロイ Workflow: `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/.github/workflows/deploy-backend-cloud-run.yml`

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

- `POST /analysis/vectorize/sentence`
  - テキスト全体を1つの文章ベクトルに変換して返す
  - ベクトル取得優先順: `spacy_doc` → `spacy_token_avg` → `content_token_avg` → `hash`
  - リクエスト例:
    ```json
    {
      "text": "本日の議事録を作成します。API設計と実装方針を共有します。",
      "normalize": true
    }
    ```
  - レスポンス例（抜粋）:
    ```json
    {
      "text": "本日の議事録を作成します。API設計と実装方針を共有します。",
      "meta": {
        "model": "ginza",
        "vector_dim": 300,
        "vector_source": "spacy_doc",
        "normalize": true
      },
      "sentence_vector": [0.0312, -0.0124, 0.2011, -0.0942]
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
  - このエンドポイントは現在DB参照未連携のため、常にGeminiで生成する
  - `terms` 指定時は、単語ごとに Gemini を非同期並列で呼び出す
  - リクエスト例（単体）:
    ```json
    {
      "term": "RAG",
      "context": "LLMの会話で出てきた用語"
    }
    ```

- `GET /dictionary/entries`
  - 辞書DBに登録されている単語一覧を取得する
  - クエリパラメータ: `q`（部分一致）, `limit`, `offset`

- `POST /dictionary/entries/bulk`
  - カンマ/空白区切りの単語を一括登録する
  - 各単語について Gemini で説明を生成し、意味ベクトルを付与してDBに保存する
  - 既存単語はスキップされる

- `PATCH /dictionary/entries/{id}`
  - 辞書エントリの単語/説明を更新する
  - 単語変更時は意味ベクトルも再生成する

- `DELETE /dictionary/entries/{id}`
  - 辞書エントリを削除する
  - リクエスト例（複数）:
    ```json
    {
      "terms": ["RAG", "MCP"],
      "context": "技術会話で出た用語"
    }
    ```
  - レスポンス例（単体）:
    ```json
    {
      "term": "RAG",
      "summary": "RAGは、回答生成時に外部知識を検索して根拠を補う手法です。LLMの回答精度を高める目的で使われます。",
      "source": "gemini",
      "model": "gemini-1.5-flash",
      "cached": false
    }
    ```
  - レスポンス例（複数）:
    ```json
    {
      "results": [
        {
          "term": "RAG",
          "summary": "RAGは、回答生成時に外部知識を検索して根拠を補う手法です。",
          "source": "gemini",
          "model": "gemini-1.5-flash",
          "cached": false
        },
        {
          "term": "MCP",
          "summary": "MCPは、AIが外部ツールやデータに接続するための標準プロトコルです。",
          "source": "gemini",
          "model": "gemini-1.5-flash",
          "cached": false
        }
      ]
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
