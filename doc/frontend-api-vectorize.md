# フロント向け API 仕様（ベクトル化）

このドキュメントは、Frontend メンバーがベクトル化APIを利用するための実装向け仕様です。  
バックエンド内部の実装詳細は以下を参照してください。

- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/doc/text-analysis-methods.md`

## 1. Swagger での確認先

バックエンド起動後、以下で確認できます。

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## 2. エンドポイント

- `POST /analysis/vectorize`
  - 単語（内容語）ベクトルを返す
- `POST /analysis/vectorize/sentence`
  - 文章全体の単一ベクトルを返す
- 共通: `Content-Type: application/json`

## 3. リクエスト

### 3.1 基本形

```json
{
  "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
  "deduplicate": false
}
```

### 3.2 フィールド

| 項目          | 型                 | 必須 | 既定値  | 説明                           |
| ------------- | ------------------ | ---- | ------- | ------------------------------ |
| `text`        | `string`           | 必須 | -       | 解析対象テキスト（1文字以上）  |
| `include_pos` | `string[] \| null` | 任意 | `null`  | ベクトル化対象に含める品詞     |
| `exclude_pos` | `string[] \| null` | 任意 | `null`  | ベクトル化対象から除外する品詞 |
| `min_length`  | `number`           | 任意 | `1`     | 語長の最小値                   |
| `deduplicate` | `boolean`          | 任意 | `false` | 同一基本形を1件に集約するか    |

補足:

- `include_pos` / `exclude_pos` を指定しない場合はサーバー既定の品詞フィルタが使われます。
- 空文字 `text` は `422` になります。

## 4. レスポンス

### 4.1 例

```jsonc
{
  "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
  "meta": {
    "model": "ginza",
    "vector_dim": 300,
    "input_token_count": 15,
    "output_token_count": 7,
    "vector_source_counts": {
      "spacy": 6,
      "hash": 1
    }
  },
  "tokens": [
    {
      "surface": "自然言語処理",
      "base_form": "自然言語処理",
      "pos": "名詞",
      "start": 3,
      "end": 9,
      "vector": [0.011231, -0.042001, 0.008821, -0.005238, ...],
      "vector_dim": 300,
      "vector_source": "spacy"
    }
  ]
}
```

### 4.2 フィールド

| 項目                        | 型         | 説明                                     | フロントでの主な用途                 |
| --------------------------- | ---------- | ---------------------------------------- | ------------------------------------ |
| `text`                      | `string`   | 入力された元テキスト（そのまま返却）     | 画面表示時の原文保持、オフセット基準 |
| `meta`                      | `object`   | 解析全体のメタ情報                       | 状態表示、デバッグ表示               |
| `meta.model`                | `string`   | 利用モデル名（例: `ginza`）              | 環境差異の把握、ログ表示             |
| `meta.vector_dim`           | `number`   | レスポンス全体のベクトル次元             | ベクトル処理前の次元チェック         |
| `meta.input_token_count`    | `number`   | 形態素解析後トークン数（除外前）         | 解析量の可視化                       |
| `meta.output_token_count`   | `number`   | ベクトル化して返したトークン数（除外後） | 抽出件数表示、空結果判定             |
| `meta.vector_source_counts` | `object`   | `spacy` / `hash` など取得元ごとの件数    | 品質監視（フォールバック率確認）     |
| `tokens`                    | `array`    | ベクトル化したトークン一覧               | バブルUIやリスト表示のデータ本体     |
| `tokens[].surface`          | `string`   | 表層形                                   | 表示テキスト                         |
| `tokens[].base_form`        | `string`   | 基本形                                   | 重複統合・索引用キー                 |
| `tokens[].pos`              | `string`   | 品詞                                     | 色分け、品詞フィルタUI               |
| `tokens[].start`            | `number`   | 原文中の開始位置                         | ハイライト開始位置                   |
| `tokens[].end`              | `number`   | 原文中の終了位置                         | ハイライト終了位置                   |
| `tokens[].vector`           | `number[]` | ベクトル値本体                           | 類似度計算、クラスタリング           |
| `tokens[].vector_dim`       | `number`   | トークンベクトルの次元                   | 配列長検証                           |
| `tokens[].vector_source`    | `string`   | ベクトル取得元（`spacy` / `hash`）       | フォールバック判定                   |

補足:

- `tokens[].vector` の長さは通常 `tokens[].vector_dim` と一致します。
- `tokens[].vector_dim` は通常 `meta.vector_dim` と一致します。
- `vector_source = hash` は、語彙ベクトルが取れずフォールバックした語です。

## 5. エラー仕様

### 5.1 422（入力エラー）例

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "text"],
      "msg": "String should have at least 1 character",
      "input": "",
      "ctx": { "min_length": 1 }
    }
  ]
}
```

## 6. TypeScript 型サンプル

```ts
export type VectorizeRequest = {
  text: string;
  include_pos?: string[] | null;
  exclude_pos?: string[] | null;
  min_length?: number;
  deduplicate?: boolean;
};

export type VectorizedToken = {
  surface: string;
  base_form: string;
  pos: string;
  start: number;
  end: number;
  vector: number[];
  vector_dim: number;
  vector_source: "spacy" | "hash" | string;
};

export type VectorizeResponse = {
  text: string;
  meta: {
    model: string;
    vector_dim: number;
    input_token_count: number;
    output_token_count: number;
    vector_source_counts: Record<string, number>;
  };
  tokens: VectorizedToken[];
};
```

## 7. 文章ベクトルAPI（`/analysis/vectorize/sentence`）

### 7.1 リクエスト

```json
{
  "text": "本日の議事録を作成します。API設計と実装方針を共有します。",
  "normalize": true
}
```

| 項目        | 型        | 必須 | 既定値 | 説明                                    |
| ----------- | --------- | ---- | ------ | --------------------------------------- |
| `text`      | `string`  | 必須 | -      | 文章ベクトル化対象テキスト（1文字以上） |
| `normalize` | `boolean` | 任意 | `true` | 返却ベクトルにL2正規化を適用するか      |

### 7.2 レスポンス

```jsonc
{
  "text": "本日の議事録を作成します。API設計と実装方針を共有します。",
  "meta": {
    "model": "ginza",
    "vector_dim": 300,
    "vector_source": "spacy_doc",
    "normalize": true,
    "input_token_count": 13,
    "content_token_count": 6
  },
  "sentence_vector": [0.0312, -0.0124, 0.2011, -0.0942, ...]
}
```

| 項目                       | 型         | 説明                                                                             |
| -------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `text`                     | `string`   | 入力テキスト（そのまま返却）                                                     |
| `meta.model`               | `string`   | 利用モデル名（例: `ginza`）                                                      |
| `meta.vector_dim`          | `number`   | 文章ベクトルの次元数                                                             |
| `meta.vector_source`       | `string`   | ベクトル取得元（`spacy_doc` / `spacy_token_avg` / `content_token_avg` / `hash`） |
| `meta.normalize`           | `boolean`  | 正規化を適用したか                                                               |
| `meta.input_token_count`   | `number`   | 形態素解析後トークン数                                                           |
| `meta.content_token_count` | `number`   | 内容語として採用されたトークン数                                                 |
| `sentence_vector`          | `number[]` | 文章ベクトル本体（`meta.vector_dim` 個）                                         |

### 7.3 TypeScript 型サンプル

```ts
export type SentenceVectorizeRequest = {
  text: string;
  normalize?: boolean;
};

export type SentenceVectorizeResponse = {
  text: string;
  meta: {
    model: string;
    vector_dim: number;
    vector_source:
      | "spacy_doc"
      | "spacy_token_avg"
      | "content_token_avg"
      | "hash"
      | string;
    normalize: boolean;
    input_token_count: number;
    content_token_count: number;
  };
  sentence_vector: number[];
};
```
