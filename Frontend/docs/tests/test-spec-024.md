# test-spec-024: フロート操作UIガラス化・重なり順修正の検証

## 日付

2026-05-29

## 関連オーダー

- `order-012.md`（本変更）
- `order-006.md`（フロート UI 初版・回帰確認のベース）
- `order-009.md`（設定ポップアップ UI・重なり確認対象）

## 対象ファイル

- `Frontend/src/presentation/components/FloatingControlDock.tsx`
- `Frontend/src/presentation/App.tsx`
- `Frontend/src/presentation/layout/LayoutEngine.tsx`
- `Frontend/src/presentation/components/WindowSettingsPanel.tsx`
- `Frontend/src/stores/windowSettingsUiStore.ts`
- `Frontend/src/stores/__tests__/windowSettingsUiStore.test.ts`

## テストの目的

order-012 の変更後も、録音操作・レイアウト・設定ポップアップの重なりが破綻しないことを確認する。

---

## テスト項目

| # | テストケース | 種別 | 期待結果 | 結果 |
|---|---|---|---|---|
| 1 | フロート UI 透明度 | 手動確認 | パネル背景が高透明でウィンドウ内容が透けて見える | 未実施 |
| 2 | フロート UI ぼかし | 手動確認 | ぼかしがほぼ無く（強いガラス曇りにならない） | 未実施 |
| 3 | フロート UI 枠線 | 手動確認 | 2px・アクセント色でウィンドウ枠と同程度 | 未実施 |
| 4 | 設定 vs フロート UI | 手動確認 | ウィンドウ設定を開いてもフロート UI が消えず、ウィンドウより手前に残る | 未実施 |
| 5 | 設定 vs ヘッダーメニュー | 手動確認 | 設定表示中もヘッダーのテスト/ウィンドウメニューが操作できる | 未実施 |
| 6 | フロート UI 録音 | 手動確認 | 開始→一時停止→再開が動作する | 未実施 |
| 7 | フロート UI リセット | 手動確認 | 確認ダイアログ後に全リセットできる | 未実施 |
| 8 | フロート UI 移動・リサイズ | 手動確認 | ドラッグ移動・四隅リサイズが動作する | 未実施 |
| 9 | `windowSettingsUiStore` | 単体 | 開閉・ID 置換が正しい | ✅ |
| 10 | 回帰（ビルド） | ビルド | `npm run build` 成功 | ✅ |
| 11 | 回帰（レイアウト単体） | 単体 | レイアウト関連 10 件成功 | ✅ |
| 12 | 回帰（全体テスト） | 単体 | 本変更による新規失敗なし | ✅（注記参照） |

---

## 自動テスト実行結果

### 実行コマンド

```bash
cd Frontend
npm run build
bun test src/stores/__tests__/windowSettingsUiStore.test.ts
bun test src/presentation/layout/__tests__/layoutTemplateFormat.test.ts \
  src/domain/entities/__tests__/Layout.test.ts \
  src/application/layout/__tests__/LayoutUseCase.test.ts
bun test
```

### 結果サマリー

| コマンド | 結果 | 詳細 |
|----------|------|------|
| `npm run build` | ✅ 合格 | `tsc -b && vite build` 成功（bundle size warning のみ） |
| `windowSettingsUiStore` 単体 | ✅ 合格 | 3 件成功 |
| レイアウト関連単体 | ✅ 合格 | 10 件成功、0 件失敗 |
| `bun test` 全体 | ⚠️ 参考 | **118 件中 115 合格 / 3 失敗**。失敗は `TermMapper` 3 件のみ（本ブランチ変更外・既存） |

### TermMapper 失敗（本変更と無関係）

```
(fail) TermMapper > maps one SSE row to Term with backend id
(fail) TermMapper > maps empty description when missing
(fail) TermMapper > maps SSE data array preserving order
```

本 PR の差分ファイルに `TermMapper` は含まれない。order-012 マージ前後で同一の既知失敗。

---

## 手動確認手順（推奨）

1. 発表中フェーズでフロート UI を表示し、背面のウィンドウが透けて見えることを確認する。
2. 任意ウィンドウの設定を開き、フロート UI がウィンドウの背後に回らないことを確認する。
3. 設定を開いたままヘッダーの「設定」「ウィンドウ」「テスト」がフロート UI より手前で操作できることを確認する。
4. 録音・リセット・ドラッグ・四隅リサイズを実行する。

---

## test-spec-018 との関係

| 仕様 | 内容 |
|------|------|
| test-spec-018 | フロート UI 導入・操作ウィンドウ撤去（order-006） |
| test-spec-024 | ガラス見た目・枠線・z-index（order-012）。#6〜#8 は 018 と重複するが回帰として再確認推奨 |

---

## 気づき・注意点

- `windowSettingsUiStore` は UI 専用。設定値の永続化は各 `*WindowSettingsStore` が担当。
- フロート UI は `fixed z-[48]`。アプリヘッダーは `z-50` で常にその上。レイアウト領域は `z-0` のまま（設定表示時も一括引き上げしない）。
- 発表後フェーズでも `LayoutEngine` を使うため、同様の重なりルールが適用される。
