# 用語スコア・テーマ EMA API

`app/api/endpoints/score_analysis.py` を `/analysis` にマウント。**POST** のみ、`Content-Type: application/json`。認証は現状なし。

IDF は [IDF_DATA_PIPELINE.md](./IDF_DATA_PIPELINE.md)。スキーマは `app/schemas/score_analysis.py`。

---

## 呼び出しの目安

1. 会話用の `session_id` をクライアントで発行する。  
2. **発話／チャンクが確定するたび** `POST /analysis/theme/chunk`（テーマ類似によるスコア加算を使うなら必須に近い）
3. **スコアを計算・取得する時** `POST /analysis/score/terms`。  
4. 会話終了時・会話切り替え時 `POST /analysis/theme/session/reset`。同一会話で `session_id` を使い回さないなら省略可。

テーマは**プロセス内メモリ**。再起動・別ワーカーでは共有されない。

---

## エンドポイント

| パス | 役割 |
|------|------|
| `POST /analysis/theme/chunk` | 会話テーマを 1 チャンク分 EMA 更新 |
| `POST /analysis/theme/session/reset` | その `session_id` のテーマを削除 |
| `POST /analysis/score/terms` | 複数語の素点・バフ・`final` を一括返す |

---

## `POST /analysis/theme/chunk`

**Body**

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `session_id` | string | ○（1 文字以上） |
| `text` | string | ○（1 文字以上） |

**200**

| フィールド | 型 |
|-----------|-----|
| `theme_vector` | number[] |
| `updated` | boolean |
| `diagnostics` | object |

**リクエスト例**

```json
{
  "session_id": "s1",
  "text": "チャンクの全文"
}
```

**レスポンス例**（`updated: true` でテーマが更新された場合。数値は例）

```json
{
  "theme_vector": [0.12, -0.05, 0.91],
  "updated": true,
  "diagnostics": {}
}
```

**レスポンス例**（ベクトル化スキップなどで更新しなかった場合。`theme_vector` は当該セッションに前回まで保持があればそのコピー、無ければ `[]`。`diagnostics` の中身はケースにより異なる）

```json
{
  "theme_vector": [],
  "updated": false,
  "diagnostics": {
    "skipped": true,
    "reason": "empty_sentence_vector"
  }
}
```

---

## `POST /analysis/theme/session/reset`

**Body**

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `session_id` | string | ○（1 文字以上） |

**200**

| フィールド | 型 |
|-----------|-----|
| `session_id` | string |
| `cleared` | boolean |

**リクエスト例**

```json
{
  "session_id": "s1"
}
```

**レスポンス例**（テーマが存在し削除できた場合）

```json
{
  "session_id": "s1",
  "cleared": true
}
```

**レスポンス例**（もともとテーマが無かった場合）

```json
{
  "session_id": "s1",
  "cleared": false
}
```

---

## `POST /analysis/score/terms`

**Body**

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `session_id` | string | ○ |
| `terms` | array | ○（1 件以上） |

**`terms[]`**

| フィールド | 型 | 必須 | 備考 |
|-----------|-----|------|------|
| `lemma` | string | ○ | 基本形（IDF と揃える） |
| `occurrence_count` | int | ○ | ≥0。サーバは保存せず素点に使用 |
| `term_vector` | number[] | ○ | テーマと**同一次元** |

**200**

| フィールド | 型 | 備考 |
|-----------|-----|------|
| `results` | array | 入力と同順 |
| `theme_vector_used` | number[] \| null | テーマ類似に使ったベクトル。未設定は `null` |

**`results[]`**

| フィールド | 説明 |
|-----------|------|
| `lemma` | 基本形 |
| `base` | 素点 |
| `buffs` | バフ内訳オブジェクト（キーは付いたバフだけ。空なら `{}`） |
| `final` | 合成スコア（表示に多く使う） |

**リクエスト例**

```json
{
  "session_id": "s1",
  "terms": [
    {"lemma": "語", "occurrence_count": 1, "term_vector": [0.0, 0.0, 0.1]}
  ]
}
```

**レスポンス例**（数値は例。`buffs` のキーは付いたバフのみ）

```json
{
  "results": [
    {
      "lemma": "語",
      "base": 0.35,
      "buffs": {
        "theme_linear": 0.2,
        "idf_scaled": 0.05
      },
      "final": 0.6
    }
  ],
  "theme_vector_used": [0.01, -0.02, 0.05]
}
```

**レスポンス例**（`theme/chunk` 未呼び出しなどテーマが無い場合。`theme_vector_used` は `null`、`buffs` に `theme_linear` は付かないことが多い）

```json
{
  "results": [
    {
      "lemma": "語",
      "base": 0.35,
      "buffs": {
        "idf_scaled": 0.05
      },
      "final": 0.4
    }
  ],
  "theme_vector_used": null
}
```

`theme_vector_used` が `null` のときはテーマ類似バフなし（`buffs.theme_linear` も通常付かない）。

---

## 補足

- **422**: バリデーション失敗（空の `session_id`、空の `terms`、未知フィールドなど）。  