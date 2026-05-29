# test-spec-027: 組み込みレイアウトプリセット更新（order-015）

## 日付

2026-05-29

## 関連オーダー

- `order-015.md`
- `order-014.md`（スナップショット基盤）
- `test-spec-026.md`

## 対象ファイル

- `Frontend/src/presentation/layout/ScriptableLayoutTemplates.ts`
- `Frontend/src/presentation/layout/layoutUtils.ts`
- `Frontend/src/presentation/phases/DuringPresentation/index.tsx`

## テスト項目

| # | テストケース | 種別 | 期待結果 | 結果 |
|---|---|---|---|---|
| 1 | バブル重視 appearance | コード確認 | `darkMode: false`, `themeColor: 'indigo'` | ✅ |
| 2 | ランキング重視 appearance | コード確認 | `darkMode: false`, `themeColor: 'emerald'` | ✅ |
| 3 | フルカスタム appearance | コード確認 | `darkMode: true`, `themeColor: 'rose'` | ✅ |
| 4 | 初回表示 | コード確認 | `DuringPresentation` が `bubbleFocusedPresentationSnapshot` を適用 | ✅ |
| 5 | スナップショット基盤回帰 | 単体 | layout 関連テスト 4 件成功 | ✅ |
| 6 | ビルド | 結合 | `npm run build` 成功 | ✅ |
| 7 | 手動: プリセット切替 | 手動 | 各プリセットでレイアウト・テーマ・DM が切り替わる | 未実施 |
| 8 | 手動: 初回起動 | 手動 | ライト + 群青 + バブル重視レイアウト | 未実施 |

## 実行コマンド

```bash
cd Frontend
npm run build
bun test src/presentation/layout/__tests__/layoutTemplateFormat.test.ts \
  src/presentation/layout/__tests__/presentationSnapshot.test.ts
```

## 実行結果（2026-05-29）

| コマンド | 結果 |
|----------|------|
| `bun test`（上記） | ✅ 4 件成功 |
| `npm run build` | ✅ 成功 |
