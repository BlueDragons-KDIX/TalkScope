# refer_dictionary_get_scores（SSE）仕様

バックエンドの `GET /analysis/refer_dictionary_get_scores/stream` を、文字起こし 1 文ずつ開いて受け取るモジュール。  
termStore への add は行わない（`onChunk` / `onTerms` で呼び出し側が処理する）。

---

## API（バックエンド）

| 項目 | 内容 |
|------|------|
| メソッド | `GET` |
| パス | `/analysis/refer_dictionary_get_scores/stream` |
| クエリ | `?text=` |
| 応答 | `text/event-stream` |
| 1 イベントの `data` | JSON 配列（要素は `TermRow` ） |

### `TermRow`（1 要素）

| フィールド | 型 | 意味 |
|-----------|-----|------|
| `id` | string | 単語のID（バックエンド発行） |
| `term` | string | 単語 |
| `description` | string | 説明文 |
| `score` | number | その文脈でのスコア |
| `source` | string | 例: `"db"` / `"llm"`（フロントの `Term` には載せない） |

0〜2 回 `message`（DB ヒット分 → 未登録語の LLM 分）。接続終了で 1 文のストリーム完了。

---

### 1. 文字起こしが進む（`useReferDictScoreSse`）

文分割・送信タイミングは **`useReferDict`（POST）と同型**。実装は `useReferDictScoreSse` 内（`useReferDict` は使わない）。

| 操作 | 動き |
|------|------|
| 句点等で文が完了 | その文をまだ送っていなければ SSE を 1 本開く |
| 末尾が未完了（会話が途中） | debounce 後にその文を送る（SSE 既定 1000ms） |
| 2 文字未満の文 | スキップ（送信インデックスだけ進める） |
| transcript が空 | 送信インデックスをリセット |
| 同じ文は1 回だけ送る | `lastSentIndexRef` で管理 |

### 2. 1 文ぶん SSE を開く（`streamReferDictScores`）

```
EventSource GET .../stream?text={その1文}
    ↓  message（0回以上）
onChunk(TermRow[])
    ↓  接続 CLOSED
Promise resolve（次の文へ）
```

| 段階 | 渡るデータ |
|------|-----------|
| リクエスト | クエリ `text` = 送信した 1 文 |
| 各 `message` | `event.data` → JSON 配列 → `TermRow[]` |
| コールバック | `onChunk(rows)` が chunk ごとに呼ばれる |

### 3. 呼び出し側オプション（`useReferDictScoreSse`）

| コールバック | いつ | 中身 |
|-------------|------|------|
| `onChunk` | 各 SSE chunk | `TermRow[]`（API そのまま） |
| `onTerms` | 各 chunk（`onChunk` と併用可） | `mapToTerms(rows)` 後の `Term[]` |
| `onError` | パース失敗・接続失敗など | `unknown` |

`ReferDictScoreSseBridge` 既定はコールバックなし（SSE を開いて受信するだけ）。

---

## データの流れ（全体）

```
transcriptStore.transcript（全文）
    ↓ splitIntoSentences
完了した文（未送信分のみ）
    ↓ streamReferDictScores(文)
Backend SSE: TermRow[]（chunk 0〜N 回）
    ↓ parseTermRowsFromEventData
onChunk(TermRow[])  ──任意──→  onTerms(Term[])  ← mapper
                              ↓
                         （呼び出し側: termStore 等）
```

`Term` への対応（mapper）:

| `TermRow` | `Term` |
|-----------|--------|
| `id` | `id`（そのまま） |
| `term`（trim） | `word` |
| `description`（trim） | `shortDesc` / `longDesc`（同一文） |
| `score` | `score` |
| — | `kana`・`category` 空、`relatedTerms` 空 |

---

## ファイル分担

| ファイル | 責務 |
|---------|------|
| `referDictScoreStream.ts` | URL・EventSource・`TermRow[]` パース |
| `useReferDictScoreSse.ts` | transcript 監視・文ごとの送信タイミング |
| `ReferDictScoreSseBridge.tsx` | ルートでフックを動かす（UI なし） |
| `index.ts` | 公開 export |

変換の正: `../mapper`（`StreamTypes` / `mapToTerms`）。

---

## このモジュールの外

- `termStore.addTerms` / upsert（同一 `id` の更新方針はストア側の話）
- 出現回数（`countTermFrequencies` は transcript + `activeTerms`）
- バブル・ランキング UI

ストアへ載せる例:

```ts
useReferDictScoreSse({
  onTerms: (terms) => useTermStore.getState().addTerms(terms),
})
```
