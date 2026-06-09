# test-spec-017: 議事録ウィンドウのピッカー除外検証

## 日付

2026-05-29

## 対象ファイル

- `Frontend/src/presentation/windows/registry.ts`

## テストの目的

議事録ウィンドウ機能を残したまま、ウィンドウ設定チェックボックス（WindowPicker）一覧からのみ `minutes` を除外できていることを確認する。

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `getLayoutSelectableWindows` のフィルタ | 実装確認 | `minutes` が返却リストに含まれない |
| 2 | ウィンドウ登録状態 | 実装確認 | `registerAllWindows` に `minutes` が残り機能自体は利用可能 |
| 3 | WindowPicker UI | 手動確認 | チェックボックス一覧に「議事録」が表示されない |
| 4 | 発表後表示 | 手動確認 | 発表後フェーズでは引き続き議事録ウィンドウが表示される |

## 実行結果

### 実行コマンド

```bash
cd Frontend
npm run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `npm run build` | 合格 | `tsc -b && vite build` 成功（bundle size warningのみ） |
