# test-spec-011: SSEパイプライン可視化ウィンドウ

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/stores/pipelineDebugStore.ts`
- `Frontend/src/stores/__tests__/pipelineDebugStore.test.ts`
- `Frontend/src/presentation/hooks/useReferDictScoreSse.ts`
- `Frontend/src/presentation/components/ReferDictScoreSseBridge.tsx`
- `Frontend/src/presentation/windows/PipelineDebugWindow/index.tsx`
- `Frontend/src/presentation/windows/index.ts`

## テストの目的

SSE処理パイプライン（送信→受信→閾値フィルタ→バブル表示）を本番相当UIで1ウィンドウに可視化し、階層別表示の確認をしやすくする。

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | パイプラインログ保持 | 単体 | 送信文・SSE受信語・フィルタ後語・バブル語が保持される |
| 2 | レイヤー表示切替 | 単体 | 各階層の表示/非表示をチェックボックスで切替できる |
| 3 | SSE送信前フック | 実装確認 | `useReferDictScoreSse` が `onBeforeSend` を発火する |
| 4 | 可視化ウィンドウ登録 | 実装確認 | `SSE可視化` がウィンドウ選択から追加可能 |
| 5 | 閾値表示の同期 | 実装確認 | 設定モーダルのスライダー変更が可視化ウィンドウに即反映される |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/pipelineDebugStore.test.ts
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test src/stores/__tests__/pipelineDebugStore.test.ts` | 合格 | 5件成功、0件失敗 |
| `bun run build` | 合格 | `tsc -b && vite build` 成功 |
