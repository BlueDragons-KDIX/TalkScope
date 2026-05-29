# test-spec-023: クリック履歴ウィンドウフォント設定の検証

## 日付

2026-05-29

## 対象ファイル

- `Frontend/src/stores/historyWindowSettingsStore.ts`
- `Frontend/src/presentation/components/WindowSettingsPanel.tsx`
- `Frontend/src/presentation/windows/HistoryWindow/index.tsx`
- `Frontend/src/app/components/HistoryPanel.tsx`

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | 設定ポップアップ | 手動確認 | 「履歴テキスト」スライダーが表示される（空メッセージではない） |
| 2 | 表示連動 | 手動確認 | スライダーで語名・説明のサイズが変わる |
| 3 | 永続化 | 単体/手動 | `historyWindowSettingsStore` が localStorage に保存する |
| 4 | クランプ | 単体 | 範囲外は 10〜24px にクランプ |
| 5 | 回帰（ビルド） | ビルド | `npm run build` が成功する |
