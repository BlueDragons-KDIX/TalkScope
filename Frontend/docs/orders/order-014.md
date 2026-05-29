# order-014: 開発者ツール — プレゼン設定スナップショット

## 日付

2026-05-29

## 参加者

- ユーザー（担当者）
- Codex

## 関連

- `order-005` 以降のレイアウトコピー機能を拡張
- `test-spec-005.md`（レイアウトのみの旧仕様）
- `test-spec-026.md`（本変更の検証）

---

## 指示要約

アプリヘッダー右の **テスト** メニューおよび **レイアウト** メニューで、レイアウトツリーだけでなく次もまとめて扱う。

| 項目 | 保存先（適用先） |
|------|------------------|
| レイアウトツリー | `layoutStore` |
| 各ウィンドウ設定 | 各 `*WindowSettingsStore` |
| フロート操作 UI | `floatingControlDockUiStore` |
| テーマカラー・ダークモード | `presentationAppearanceStore` |
| アプリ全体文字サイズ | `contentFontScaleStore` |

---

## データ形式

`PresentationSnapshot`（`version: 1`）を JSON でやり取りする。

- **コピー／オリジナル保存**: コメント行なしの JSON のみ
- **組み込みスクリプトテンプレート**: `layout` のみ渡す従来どおり、または `snapshot` 付きで全設定を復元
- **旧オリジナル保存**（`snapshot` なし）: レイアウトツリーのみ適用（後方互換）

---

## 実装方針

| ファイル | 役割 |
|----------|------|
| `presentationSnapshot.ts` | 取得・適用・パース・JSON 出力 |
| `presentationAppearanceStore.ts` | 外観（App から利用） |
| `floatingControlDockUiStore.ts` | フロート UI 位置・倍率 |
| `layoutTemplateStore.ts` | オリジナルに `snapshot` を永続化 |
| `TestFeaturesPopover.tsx` | 「現在のプレゼン設定」をコピー |
| `LayoutPresetMenu.tsx` | 保存・プリセット選択で `applyPresentationLayout` |
| `ScriptableLayoutTemplate.snapshot?` | コード定義テンプレートの全設定復元（任意） |

---

## 完了条件

- [x] テストメニューから JSON コピー（コメントなし）
- [x] オリジナル保存に全設定を含む
- [x] オリジナル／`snapshot` 付きプリセット選択で全設定を反映
- [x] `snapshot` なし組み込みプリセットはレイアウトのみ変更（現行設定維持）
- [x] 単体テスト・ビルド成功
