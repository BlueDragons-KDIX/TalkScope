# テキスト解析・ベクトル化手法（Backend）

このドキュメントは、LexiFlow Backend のテキスト解析とベクトル化の実装内容をまとめたものです。  
実装本体は以下です。

- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/app/services/text_analysis.py`
- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/app/api/endpoints/analysis.py`
- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/app/schemas/analysis.py`

## 1. 目的

- フロントエンドから受け取ったテキストを形態素解析する
- 内容語（名詞など）だけを選別してベクトル化する
- 接続詞・助詞など、重要語抽出に不要な語を既定で除外する
- 後段で「重要語判定・類似語検索・スコアリング」に使える構造で返す

## 2. 主要API

- `POST /analysis/vectorize`
  - 入力テキストを解析し、品詞フィルタ済みトークンのベクトルを返す
  - `response_model` でスキーマ固定

エンドポイント実装:

- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/app/api/endpoints/analysis.py`

## 3. ベクトル化ロジックの手順

対象関数:

- `vectorize_content_tokens(...)`  
  `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/app/services/text_analysis.py`

処理フロー:

1. `morphological_analysis(text)` でトークン列を作成
2. 品詞フィルタ
3. 語長フィルタ（`min_length`）
4. 必要なら同一語の重複除去（`deduplicate`）
5. 各トークンのベクトル取得
6. `meta` と `tokens` を組み立てて返却

## 4. 品詞フィルタ方針

### 4.1 既定で「含める」品詞

- `NOUN`, `PROPN`, `VERB`, `ADJ`, `ALPHA`, `NUM`
- `名詞`, `動詞`, `形容詞`, `形状詞`

### 4.2 既定で「除外する」品詞

- 接続詞: `CCONJ`, `SCONJ`, `CONJ`, `接続詞`
- 助詞系: `PART`, `ADP`, `助詞`
- 助動詞系: `AUX`, `助動詞`
- 記号系: `PUNCT`, `補助記号`, `SYM`, `記号`
 
必要なら `include_pos` / `exclude_pos` で上書き可能です。

## 5. ベクトル取得手法（実装順）

各トークンに対し、以下の優先順でベクトルを決定します。

1. `doc.char_span(start, end)` の span ベクトル
2. 文字位置が重なる token ベクトルの平均
3. `base_form` の語彙ベクトル
4. `surface` の語彙ベクトル
5. ハッシュベースの決定的フォールバックベクトル

### 5.1 フォールバックベクトル

- spaCy/GiNZA が使えない環境や OOV 語でも必ず返せるように実装
- `sha256` を使った決定的疑似ベクトルを生成
- L2 正規化して返却
- 既定次元は `64`（spaCy の次元が取れる場合はそちらを優先）

### 5.2 次元数の決まり方（重要）

- 通常運用（`ja_ginza` 使用時）: `300` 次元
- spaCy/GiNZA が使えない場合: `64` 次元（ハッシュフォールバック）
- つまり、次元数は「利用している埋め込みモデル」に依存する
- API レスポンスでは `meta.vector_dim` と各トークンの `vector_dim` で確認できる
- より大きい次元のモデルを使えば次元数は増える可能性があるが、高次元であれば常に精度が上がるわけではない（学習データ・ドメイン適合・前処理の影響も大きい）

## 6. 入力パラメータ仕様

`VectorizeRequest`:

- `text: str` 必須
- `include_pos: list[str] | null` 任意
- `exclude_pos: list[str] | null` 任意
- `min_length: int` 既定 `1`
- `deduplicate: bool` 既定 `false`

スキーマ定義:

- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/app/schemas/analysis.py`

## 7. 出力仕様

`VectorizeResponse`:

- `text`: 入力テキスト（オフセット整合のため原文そのまま）
- `meta`:
  - `model`: 利用モデル名（例: `ja_ginza`）
  - `vector_dim`: ベクトル次元
  - `input_token_count`: 形態素解析トークン数
  - `output_token_count`: ベクトル化後トークン数
  - `vector_source_counts`: `spacy` / `hash` の件数
- `tokens[]`:
  - `surface`, `base_form`, `pos`, `start`, `end`
  - `vector`（float配列）
  - `vector_dim`
  - `vector_source`（`spacy` or `hash`）

## 8. 入出力例（API）

### 8.1 リクエスト例

```json
POST /analysis/vectorize
{
  "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
  "deduplicate": false
}
```

### 8.2 レスポンス例（抜粋）

```jsonc
{
  "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
  "meta": {
    "model": "ja_ginza",
    "vector_dim": 300,
    "input_token_count": 16,
    "output_token_count": 5,
    "vector_source_counts": {
      "spacy": 5
    }
  },
  "tokens": [
    {
      "surface": "今日",
      "base_form": "今日",
      "pos": "名詞",
      "start": 0,
      "end": 2,
      "vector_dim": 300,
      "vector_source": "spacy",
      "vector": [0.021104, -0.009238, 0.034221, 0.018922, 0.004118, -0.027331, ...]
    },
    {
      "surface": "自然言語処理",
      "base_form": "自然言語処理",
      "pos": "名詞",
      "start": 3,
      "end": 9,
      "vector_dim": 300,
      "vector_source": "spacy",
      "vector": [0.011231, -0.042001, 0.008821, -0.005238, 0.019772, -0.010044, ...]
    },
    {
      "surface": "勉強",
      "base_form": "勉強",
      "pos": "名詞",
      "start": 10,
      "end": 12,
      "vector_dim": 300,
      "vector_source": "spacy",
      "vector": [-0.031881, 0.014390, 0.007118, -0.002810, 0.022551, -0.009002, ...]
    },
    {
      "surface": "結果",
      "base_form": "結果",
      "pos": "名詞",
      "start": 20,
      "end": 22,
      "vector_dim": 300,
      "vector_source": "spacy",
      "vector": [0.005019, -0.018221, 0.026339, 0.012004, -0.003118, 0.009882, ...]
    },
    {
      "surface": "共有",
      "base_form": "共有",
      "pos": "名詞",
      "start": 23,
      "end": 25,
      "vector_dim": 300,
      "vector_source": "spacy",
      "vector": [-0.013308, 0.025770, -0.004992, 0.011044, -0.016002, 0.007981, ...]
    }
    // 上記以外の項目がある場合も同様の形式で続く
  ]
}
```

補足:

- `そして`（接続詞）は既定で除外されるため `tokens` に入らない
- 各 `vector` の `...` は、実際には続きの要素があることを明示している
- 例は `jsonc`（コメント付きJSON）表記で、説明しやすさを優先している

## 9. 入出力例（サービス関数）

### 9.1 呼び出し例

```python
from app.services.text_analysis import vectorize_content_tokens

result = vectorize_content_tokens(
    text="今日は自然言語処理を勉強しますが、そして結果を共有します。",
    deduplicate=False,
)
```

### 9.2 期待される挙動

- `result["tokens"]` に `は`, `が`, `そして` は含まれない
- `result["tokens"]` の各要素は `vector` と `vector_dim` を持つ
- `result["meta"]["vector_dim"] > 0`

## 10. テスト

- サービステスト:  
  `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/tests/test_text_analysis_service.py`
- エンドポイントテスト:  
  `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/tests/test_analysis_endpoint.py`

実行:

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv run pytest -q
```

## 11. 現時点の制約と今後

- GiNZA語彙にない語は `hash` フォールバックになる
- 現在は「語ごとの静的ベクトル」中心で、文脈埋め込みは未導入
- 今後は類似度計算・重要語スコア（TF-IDF/係り受け）との統合を進める

### 11.1 今後のモデル選択肢（展望）

- `GiNZA / spaCy`（現行延長）
  - 次元目安: `300`
  - 特徴: 既存実装に最も載せ替えやすい
- `fastText`（日本語事前学習ベクトル）
  - 次元目安: `300`
  - 特徴: 未知語に比較的強く、軽量運用しやすい
- `Word2Vec`（自前学習）
  - 次元目安: `100 / 200 / 300` など
  - 特徴: ドメイン特化語彙に適応しやすい
- `BERT系`（日本語BERTなど）
  - 次元目安: `768`（base）/ `1024`（large）
  - 特徴: 文脈反映が強いが、推論コストが高め
- `Sentence-Transformers / E5系`
  - 次元目安: `384 / 768 / 1024`（モデル依存）
  - 特徴: 類似検索で有効。主用途は文・句ベクトル
- `OpenAI Embeddings`（外部API）
  - 次元目安: モデル依存（例: `1536 / 3072`）
  - 特徴: 高品質だがAPIコスト・遅延・外部依存を考慮

補足:

- より高次元モデルに切り替えると `vector_dim` は増える可能性がある
- ただし「高次元 = 常に高精度」ではない。学習データ、ドメイン適合、前処理、推論コストのバランスで選定する
