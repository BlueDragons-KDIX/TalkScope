# test-spec-022: バブル自動切り替えヘッダーボタンの検証

## 日付

2026-05-29

## 対象ファイル

- `Frontend/src/presentation/components/BubbleAutoSwitchHeaderButton.tsx`
- `Frontend/src/presentation/layout/LayoutEngine.tsx`
- `Frontend/src/presentation/components/WindowSettingsPanel.tsx`

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | 表示位置 | 手動確認 | バブルウィンドウのみ、設定ボタン左に自動切り替えボタンがある |
| 2 | ON/OFF 強調 | 手動確認 | ON はアクセント強調 + バッジ、OFF はグレー系で区別できる |
| 3 | トグル動作 | 手動確認 | クリックで説明⇔用語の自動切り替えが有効/無効になる |
| 4 | 設定ポップアップ | 手動確認 | トグルはなく、切り替え間隔スライダーのみある |
| 5 | 永続化 | 手動確認 | リロード後も ON/OFF と間隔が保持される |
| 6 | 回帰（ビルド） | ビルド | `npm run build` が成功する |

## 結果

| # | 結果 | 備考 |
|---|---|---|
| 1 | 未実施 | |
| 2 | 未実施 | |
| 3 | 未実施 | |
| 4 | 未実施 | |
| 5 | 未実施 | |
| 6 | 未実施 | |
