# order-006: 操作（リモコン）ウィンドウの撤去とフロート操作UIへの置き換え

## 日付

2026-05-29

## 参加者

- ユーザー（担当者）
- Codex

---

## 指示要約

- 操作（リモコン）ウィンドウを削除する。
- 発表終了ボタンを削除する（機能は残し、UI 上は非表示にする）。
- 録音開始ボタンとリセットボタンを 1 つのコンポーネントにまとめ、フロート UI 化する。
- フロート UI は画面上をドラッグで移動できるようにする。
- 見た目はグラフィカルにし、アプリの世界観に合わせる。大きさと色に配慮する。

---

## 実装方針

1. **フロート操作 UI を新規作成**
   - `FloatingControlDock` を追加し、録音（開始/一時停止/再開）とリセット（確認ダイアログ付き）をまとめる。
   - ドラッグハンドルを持ち、Pointer Events で移動。画面外に出ないようクランプし、リサイズにも追従。
   - アクセントテーマ（`useAccentTheme`）でボーダー/グローを色付けし、録音は緑/一時停止は橙のグラデーションで状態を表現。
   - `App.tsx` の `AccentThemeProvider` / `PresentationShellProvider` 配下にマウント。

2. **操作（リモコン）ウィンドウの撤去**
   - `registerAllWindows` から `systemControl` の登録を削除し、`SystemControlWindow` コンポーネントを削除。
   - レイアウト生成から操作ドックを除去：
     - `layoutUtils.ts` の `attachSystemControlDock` と関連ヘルパ（`tryUnwrapSystemControlDock` など）を撤去し、ドック無しの素直なツリーを返すよう変更。
     - WindowPicker 用ヘルパを `addWindowToLayout` / `removeWindowFromLayout` / `collectWindowIdsInLayout` / `findRightmostLeafWindowId` に整理。
   - `ScriptableLayoutTemplates` のプリセットから `systemControl` リーフを除去し、比率を再構成。

3. **発表終了ボタンの非表示化（機能維持）**
   - 唯一の描画箇所だった `SystemControlWindow` を撤去することで非表示化。
   - `PhaseTransitionButton` コンポーネントと `phaseStore.transitionTo` は残し、フェーズ遷移機能自体は温存。

---

## 変更ファイル

- `Frontend/src/presentation/components/FloatingControlDock.tsx`（新規）
- `Frontend/src/presentation/App.tsx`
- `Frontend/src/presentation/windows/index.ts`
- `Frontend/src/presentation/windows/SystemControlWindow/index.tsx`（削除）
- `Frontend/src/presentation/layout/layoutUtils.ts`
- `Frontend/src/presentation/layout/ScriptableLayoutTemplates.ts`
- `Frontend/src/presentation/components/WindowPickerButton.tsx`

---

## 補足・判断

- マイク/モード選択は旧操作ウィンドウの設定パネルにあったが、今回のフロート UI は指示どおり「録音・リセット」のみに限定した。モード/マイクは既定値（localStorage 保持・先頭マイク）で動作する。今後必要なら別 UI で復帰させる。
- `systemControlWindow.ts` 定数と `LayoutEngine` 側のドック最小サイズ処理は、汎用的な防御コードとして残置（操作ウィンドウが存在しないため発火しない）。
