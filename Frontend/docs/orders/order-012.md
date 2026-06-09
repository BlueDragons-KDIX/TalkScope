# order-012: フロート操作UIのガラス化と設定ポップアップの重なり順修正

## 日付

2026-05-29

## 参加者

- ユーザー（担当者）
- Codex

---

## 指示要約

1. **フロート操作 UI（`FloatingControlDock`）** のパネル背景を、かなり透明に近いガラス UI にする（ぼかしはほぼ無し）。
2. 枠線を各ウィンドウと同程度の太さ（2px・アクセント色）にする。
3. **ウィンドウ設定ポップアップ** を開いたとき、フロート UI より手前に表示する（重なり順の不具合修正）。

---

## 実装方針

### 1. フロート UI の見た目

- パネル: `bg-slate-950/8`（ダーク）/ `bg-white/10`（ライト）、`backdrop-blur-[2px]`
- 枠: `border-2` + `accentRgba(rgb, 0.72 / 0.66)`（`LayoutEngine` のウィンドウ枠と同系）
- リセットボタン: 半透明 + `backdrop-blur-[1px]`
- 録音ボタンのグラデーションは維持（操作の視認性優先）

### 2. z-index（重なり順）

**原因（初版）:** 設定表示時にレイアウト全体を `z-[55]` に上げたため、フロート UI（`z-[40]`）がウィンドウの背後に回り消えて見えた。

**対応（重なり順）:**

| 要素 | z-index |
|---|---|
| レイアウト領域・ウィンドウ | `z-0`（常時） |
| ウィンドウ設定パネル（ウィンドウ内 `absolute`） | `z-[80]`（ウィンドウ内のみ） |
| フロート操作 UI | `z-[48]`（ヘッダーより下、上記より上） |
| アプリヘッダー | `z-50` |
| ヘッダーのテスト/ウィンドウメニュー | `z-[60]`〜`z-[70]`（ヘッダー配下） |

- `windowSettingsUiStore` で `openWindowId` を `LayoutEngine` で管理（アンマウント時クリア）
- レイアウト領域の一括 `z-index` 引き上げは行わない

---

## 変更ファイル

- `Frontend/src/presentation/components/FloatingControlDock.tsx`
- `Frontend/src/presentation/App.tsx`
- `Frontend/src/presentation/layout/LayoutEngine.tsx`
- `Frontend/src/presentation/components/WindowSettingsPanel.tsx`（z-index 調整のみ）
- `Frontend/src/stores/windowSettingsUiStore.ts`（新規）

---

## 完了条件

- フロート UI が高透明で背面が透けて見えること
- 枠がウィンドウと同程度に太く見えること
- ウィンドウ設定を開いてもフロート UI がウィンドウの背後に回らないこと（フロート UI はヘッダー設定より下・レイアウトより上）
- 録音・リセット・ドラッグ・リサイズが従来どおり動作すること
- `npm run build` および関連単体テストが成功すること
