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

**原因:** 設定パネルはウィンドウ内 `absolute` だが、親のレイアウト領域は低いスタッキングコンテキスト。フロート UI は `fixed z-[60]` で常に前面だった。

**対応:**

| 要素 | z-index |
|---|---|
| フロート操作 UI | `z-[40]` |
| レイアウト領域（設定表示中のみ） | `z-[55]` |
| 設定パネル（ウィンドウ内） | `z-[80]` |
| ヘッダーのテスト/ウィンドウメニュー | `z-[60]`（従来どおり前面） |

- `windowSettingsUiStore` で `openWindowId` を `LayoutEngine` と `App` で共有
- `LayoutEngine` アンマウント時に `openWindowId` をクリア

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
- 設定ポップアップがフロート UI に隠れないこと
- 録音・リセット・ドラッグ・リサイズが従来どおり動作すること
- `npm run build` および関連単体テストが成功すること
