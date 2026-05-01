# Frontend API仕様書

この仕様書は `src/infrastructure/api/` 配下の実装を基準に、Frontend から利用するAPIクライアント仕様をまとめたものです。

## 対象ファイル

- `dictionaryApi.ts`
- `referDictWithOverlaps.ts`
- `themeVectorApi.ts`
- `vectorSendWithOverlap.ts`
- `vectorApiCheck.ts`

## 共通仕様

- **Base URL 優先順**:
  1. `VITE_BACKEND_URL`
  2. `VITE_VECTOR_API_URL`
- **エンドポイント生成**:
  - `new URL(base).origin` が成功する場合は origin ベースで固定パスを連結
  - 失敗時は文字列連結でフォールバック
- **HTTPエラー時**:
  - 各API関数は `Error` を throw する
  - 呼び出し側（主に `application/hooks`）で捕捉して警告表示や再送制御を行う

## `dictionaryApi.ts`

辞書管理モーダル向けの CRUD API クライアントです。

- **API Prefix**: `/dictionary`
- **データ型**:
  - `DictionaryEntry`
  - `DictionaryEntryListResponse`
  - `DictionaryBulkRegisterResponse`
  - `DictionaryEntryUpdatePayload`

### API: 一覧取得

- **Function**: `fetchDictionaryEntries(params)`
- **Method**: `GET`
- **Path**: `/dictionary/entries`
- **Query**:
  - `q?: string`
  - `limit?: number`
  - `offset?: number`
- **Response**: `DictionaryEntryListResponse`

### API: 更新

- **Function**: `updateDictionaryEntry(entryId, payload)`
- **Method**: `PATCH`
- **Path**: `/dictionary/entries/{entryId}`
- **Body**: `DictionaryEntryUpdatePayload`
- **Response**: `DictionaryEntry`

### API: 削除

- **Function**: `deleteDictionaryEntry(entryId)`
- **Method**: `DELETE`
- **Path**: `/dictionary/entries/{entryId}`
- **Response**: なし（`void`）

### API: 一括登録

- **Function**: `bulkRegisterDictionaryTerms(rawTerms)`
- **Method**: `POST`
- **Path**: `/dictionary/entries/bulk`
- **Body**:
  - `raw_terms: string`
- **Response**: `DictionaryBulkRegisterResponse`

## `referDictWithOverlaps.ts`

文字起こし文を `refer_dictionary` に問い合わせるためのAPI層です。

- **API Path**: `/analysis/refer_dictionary`
- **主な型**:
  - `ReferDictEntry`
  - `ReferDictResponse`
  - `ReferDictPayload`

### API: 1文問い合わせ

- **Function**: `sendReferDictRequest(payload, baseUrl)`
- **Method**: `POST`
- **Path**: `/analysis/refer_dictionary`
- **Body**:
  - `text: string`（`payload.text`）
- **Response**: `ReferDictResponse`

### 補助ロジック

- `createReferDictState()`
  - 送信済みインデックスを保持し、未送信文のペイロードを組み立てる
  - 主に `useReferDict` が利用
- `firstSentence(desc)`
  - 説明文から先頭1文を抽出（UIの短文表示用）

## `vectorSendWithOverlap.ts`

文字起こしをベクトル化エンドポイントへ送信するAPI層です。

- **API Path**: `/analysis/vectorize`
- **型**:
  - `VectorPayload`:
    - `sentences: string[]`
    - `startIndex: number`
    - `endIndex: number`

### API: ベクトル送信

- **Function**: `sendVectorRequest(payload, baseUrl)`
- **Method**: `POST`
- **Path**: `/analysis/vectorize`
- **Body**:
  - `text: string`（`payload.sentences.join('\n')`）
- **Response**: `unknown`（生JSONを返す）

### 補助ロジック

- `createVectorSendState({ overlapSentences })`
  - 前回送信済み区間を保持し、オーバーラップ付き送信ペイロードを作成
- `getVectorApiUrl(baseUrl)`
  - Base URL と固定パスから送信URLを生成

## `themeVectorApi.ts`

主題テキストをベクトル化して平均ベクトルを返すAPI層です。実体は `vectorize` API を利用します。

- **Function**: `fetchThemeVector(text)`
- **Method**: `POST`
- **Path**: `/analysis/vectorize`
- **Body**:
  - `text: string`（trim済み）
- **Response**:
  - `ThemeVectorResult | null`
  - `ThemeVectorResult`:
    - `vector: number[]`
    - `dim: number`

### 振る舞い

- 空文字入力は `null` を返す（リクエストしない）
- レスポンス中の `tokens[].vector` を平均して主題ベクトルを計算
- トークン0件や次元不正時は `null`

## `vectorApiCheck.ts`

ベクトルAPI疎通確認用の軽量チェックです。

- **Function**: `checkVectorApi()`
- **Method**: 内部で `sendVectorRequest()` を呼び出し
- **Payload**:
  - `sentences: ['接続確認用テスト文。']`
  - `startIndex: 0`
  - `endIndex: 1`
- **Response**: `VectorApiCheckResult`
  - 成功: `{ ok: true, url }`
  - 失敗: `{ ok: false, error }`

## 更新ルール

- `src/infrastructure/api` にファイルを追加・変更した場合は、この `API_SPEC.md` も同時に更新すること。
- エンドポイントパス・リクエスト形式・レスポンス型を変更した際は、呼び出し元の hook 仕様とあわせて追記すること。
