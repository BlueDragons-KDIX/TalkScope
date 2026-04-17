# IndexedDB データ層（画像の3ストア構成）

[Zenn: IndexedDB 利用方法](https://zenn.dev/peter_norio/articles/e0620bfd7feb8f) と画像のスキーマに沿って、**idb** で実装しています。

## 用語と構造（Zenn より）

- **データベース**: 最上位。名前 `lexiflow-db`、バージョンでマイグレーション。
- **オブジェクトストア**: データを格納する場所。RDB のテーブルに相当。
- **キー**: インラインキー（データの項目を keyPath に指定）と自動採番（autoIncrement）を使用。
- **インデックス**: キー以外の項目で検索するために createIndex で定義。

## ストア構成（画像どおり）

| ストア                                    | 主キー (keyPath)                    | 説明                                                            |
| ----------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| **presentations**（すべての発表）         | `presentationId` (string)           | 発表id, 会話の全文, 会話のベクトル, 主題のベクトル, 発表名=主題 |
| **history**（履歴・辞書で使う）           | `historyId` (number, autoIncrement) | 履歴id, 発表id, 単語id, ピン留めしたか。発表⇔単語の紐付け。     |
| **words**（すべての単語情報・辞書で使う） | `wordId` (string)                   | 単語id, 単語, 解説, ベクトル, 完全に理解した, 関連ワード        |

## リレーション（画像どおり）

- **履歴.発表id** → すべての発表.発表id（FK）
- **履歴.単語id** → すべての単語情報.単語id（FK）

## 実装の流れ（Zenn の手順）

1. **定義**: `getDB()` 内で `openDB(DB_NAME, DB_VERSION, { upgrade(db) { ... } })` を実行。
   - `createObjectStore(name, { keyPath, autoIncrement })` でストア作成。
   - `createIndex(name, keyPath, { unique, multiEntry })` でインデックス作成（履歴は byPresentationId, byWordId）。
2. **操作**: トランザクション開始 → オブジェクトストア取得 → add/put/delete/get/getAll。
   - 読み書きは `transaction(store, 'readwrite')`、参照のみは `'readonly'`。

## 使い方

```ts
import {
  getDB,
  putPresentation,
  getPresentation,
  putWord,
  getWord,
  setHistoryPinned,
  getPinnedWordIdsByPresentation,
} from "@/app/db";
```

- 発表の保存: `putPresentation({ presentationId, fullText, conversationVector, themeVector, themeText })`
- 単語情報の保存: `putWord({ wordId, word, explanation, vector, isUnderstood, relatedWords })`
- ピン留めの反映: `setHistoryPinned(presentationId, wordId, true)`
- この発表のピン一覧: `getPinnedWordIdsByPresentation(presentationId)`

## 依存

- **idb**: Promise でラップした IndexedDB API。`bun add idb` で追加済み。

## マイグレーション

スキーマを変えるときは `schema.ts` の `DB_VERSION` を増やし、`client.ts` の `upgrade` 内で `oldVersion` を見てストア追加・インデックス追加を行う。既存データは引き継がれる。
