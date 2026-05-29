# test-spec-026: プレゼン設定スナップショット（order-014）

## 日付

2026-05-29

## 関連オーダー

- `order-014.md`
- `test-spec-005.md`（レイアウトのみコピーの旧検証 — コピー形式は本 spec で置き換え）

## 対象ファイル

- `Frontend/src/presentation/layout/presentationSnapshot.ts`
- `Frontend/src/presentation/layout/layoutTemplateFormat.ts`
- `Frontend/src/presentation/layout/__tests__/layoutTemplateFormat.test.ts`
- `Frontend/src/presentation/layout/__tests__/presentationSnapshot.test.ts`
- `Frontend/src/stores/presentationAppearanceStore.ts`
- `Frontend/src/stores/floatingControlDockUiStore.ts`
- `Frontend/src/stores/layoutTemplateStore.ts`
- `Frontend/src/stores/__tests__/layoutTemplateStore.test.ts`
- `Frontend/src/presentation/components/TestFeaturesPopover.tsx`
- `Frontend/src/presentation/components/LayoutPresetMenu.tsx`

## テスト項目

| # | テストケース | 種別 | 期待結果 | 結果 |
|---|---|---|---|---|
| 1 | JSON エクスポート | 単体 | `{` で始まり `//` コメントを含まない | ✅ |
| 2 | フルスナップショット往復 | 単体 | レイアウト・外観・フロートUI・windowSettings が復元可能 | ✅ |
| 3 | レイアウトのみ JSON（後方互換） | 単体 | `parseLayoutTemplateText` で `layout` のみ取得できる | ✅ |
| 4 | `applyPresentationSnapshot` | 単体 | 外観・文字サイズ・ウィンドウ設定がストアに反映される | ✅ |
| 5 | オリジナル保存 | 単体 | `snapshot` 付きで localStorage に保存される | ✅ |
| 6 | 旧オリジナル読み込み | 単体 | `snapshot` なしテンプレートは `layout` のみ保持 | ✅ |
| 7 | 手動: テストコピー | 手動 | 各フィールドが JSON に含まれる | 未実施 |
| 8 | 手動: オリジナル適用 | 手動 | 保存時の設定が復元される | 未実施 |
| 9 | 手動: 組み込みプリセット | 手動 | `snapshot` なしはレイアウトのみ変化 | 未実施 |
| 10 | ビルド | 結合 | `npm run build` 成功 | ✅ |

## 実行コマンド

```bash
cd Frontend
npm run build
bun test src/presentation/layout/__tests__/layoutTemplateFormat.test.ts \
  src/presentation/layout/__tests__/presentationSnapshot.test.ts \
  src/stores/__tests__/layoutTemplateStore.test.ts
```

## 実行結果（2026-05-29）

| コマンド | 結果 |
|----------|------|
| 上記 `bun test` | ✅ 合格 |
| `npm run build` | ✅ 合格 |
