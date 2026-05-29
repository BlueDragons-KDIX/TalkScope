# test-spec-018: フロート操作UI化と操作ウィンドウ撤去の検証

## 日付

2026-05-29

## 対象ファイル

- `Frontend/src/presentation/components/FloatingControlDock.tsx`
- `Frontend/src/presentation/App.tsx`
- `Frontend/src/presentation/windows/index.ts`
- `Frontend/src/presentation/layout/layoutUtils.ts`
- `Frontend/src/presentation/layout/ScriptableLayoutTemplates.ts`
- `Frontend/src/presentation/components/WindowPickerButton.tsx`

## テストの目的

操作（リモコン）ウィンドウを撤去し、録音・リセットをまとめた移動可能なフロート UI に置き換えても、レイアウト系・録音操作が破綻しないことを確認する。

- 操作ウィンドウが登録・レイアウト・プリセットから消えていること
- 発表終了ボタンが UI 上に現れず、フェーズ遷移機能（`phaseStore`）は残っていること
- フロート UI が録音（開始/一時停止/再開）とリセットを提供し、ドラッグで移動できること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `registerAllWindows` | 実装確認 | `systemControl` を登録しない |
| 2 | `makeDefaultLayout` / `makeAfterLayout` | 実装確認 | 操作ドックを含まない素のレイアウトを返す |
| 3 | `ScriptableLayoutTemplates` | 実装確認 | 全プリセットに `systemControl` リーフが存在しない |
| 4 | `addWindowToLayout` / `removeWindowFromLayout` | 実装確認 | ドック前提の分岐なくウィンドウを追加/除去できる |
| 5 | フロート UI 録音ボタン | 手動確認 | 待機→録音→一時停止→再開が状態に応じて切り替わる |
| 6 | フロート UI リセット | 手動確認 | 確認ダイアログ経由で全リセットが実行される |
| 7 | フロート UI ドラッグ | 手動確認 | ハンドルで移動でき、画面外に出ない（リサイズ追従） |
| 8 | 発表終了ボタン | 手動確認 | UI に表示されないが、`phaseStore.transitionTo` は利用可能なまま |
| 9 | 回帰（ビルド） | ビルド | `npm run build`（`tsc -b && vite build`）が成功する |
| 10 | 回帰（レイアウトテスト） | 単体 | `layoutTemplateFormat` / `Layout` / `LayoutUseCase` テストが成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
npm run build
bun test src/presentation/layout/__tests__/layoutTemplateFormat.test.ts src/domain/entities/__tests__/Layout.test.ts src/application/layout/__tests__/LayoutUseCase.test.ts
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `npm run build` | 合格 | `tsc -b && vite build` 成功（bundle size warning のみ） |
| `bun test ...`（レイアウト関連） | 合格 | 10 件成功、0 件失敗 |
| `bun test`（全体） | 参考 | 94 pass / 22 fail。22 failはハッピーDOM未登録による既存環境起因で、本変更前後で同一 |
