# test-spec-016: 時系列トリガーログウィンドウ検証

## 日付

2026-05-29

## 対象ファイル

- `Frontend/src/presentation/components/ReferDictScoreSseBridge.tsx`
- `Frontend/src/presentation/windows/TriggerTimelineWindow/index.tsx`
- `Frontend/src/presentation/windows/index.ts`
- `Frontend/src/stores/triggerTimelineStore.ts`
- `Frontend/src/stores/__tests__/triggerTimelineStore.test.ts`

## テストの目的

本番で有効なテスト支援ウィンドウとして、非UIトリガーの時系列ログが収集・表示・コピーできることを確認する。

- 必須5イベント（確定/送信/SSE受信/フィルタ/バブル生成）が記録される
- チェックボックスで項目の表示/非表示を切り替えられる
- 表示中全項目コピーと項目別コピーがMarkdownで動作する

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `appendLog` | 単体 | ログが追加され、`occurredAt` が設定される |
| 2 | `toggleType` | 単体 | 表示フラグがON/OFF切り替わる |
| 3 | `clearLogs` | 単体 | ログ配列が空になる |
| 4 | SSEブリッジ連携 | 実装確認 | 必須5イベントが `triggerTimelineStore` へ送られる |
| 5 | 全体コピー | 実装確認 | 表示中項目のみをMarkdownとしてクリップボードへ書き込む |
| 6 | 項目別コピー | 実装確認 | 選択項目のみをMarkdownとしてコピーできる |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/pipelineDebugStore.test.ts src/stores/__tests__/triggerTimelineStore.test.ts
npm run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test ...` | 合格 | 8件成功、0件失敗 |
| `npm run build` | 合格 | `tsc -b && vite build` 成功（bundle size warningのみ） |
