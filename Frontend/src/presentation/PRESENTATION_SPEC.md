# Presentation 仕様書

このドキュメントは `src/presentation/` 層の責務と主要コンポーネントの仕様を整理したものです。

## 目的

- UI表示とユーザー操作に関する責務を `presentation` 層に集約する
- 状態管理・外部通信ロジックは `application` / `infrastructure` 層へ委譲する
- 画面コンポーネントの役割を開発者が短時間で把握できるようにする

## ディレクトリ構成

- `components/`
  - モーダル、再利用UI、単体表示コンポーネント
- `widgets/`
  - 画面上の主要機能単位（文字起こし、バブル、履歴、詳細）
- `layouts/`
  - パネル分割レイアウトとドラッグ/リサイズの基盤

## 主要コンポーネント仕様

### `layouts/LayoutEngine.tsx`

- レイアウトツリー (`LayoutNode`) を再帰描画
- パネルのドラッグ移動・ドロップ判定
- 分割バーのドラッグによる比率変更

### `layouts/layoutUtils.ts`

- レイアウトプリセット生成（default, 2x2, horizontal, vertical, leftRight）
- ツリー操作関数（`removeLeaf`, `insertLeaf`, `movePanel`, `updateRatio`）

### `widgets/TranscriptionView.tsx`

- 文字起こしテキスト表示
- 用語ハイライトとクリック/右クリック操作
- 録音トグル、デモ読み込み、ライブデモ進捗表示

### `widgets/BubbleCloud.tsx`

- 用語バブルの物理シミュレーション描画
- カテゴリフィルタ・ピン中表示・倍率調整
- 自動切換え（AutoPlay）UI

### `widgets/TermDetailPanel.tsx`

- 選択語の詳細表示
- 用語/説明のコピー
- ピン留めトグル・外部検索リンク

### `widgets/HistoryPanel.tsx`

- 履歴一覧表示とキーワード検索
- 履歴項目クリックで再選択
- 履歴全削除

### `widgets/VectorApiCheckButton.tsx`

- ベクトルAPI接続の疎通確認を実行
- 成否をトースト表示

### `widgets/DbTestPanel.tsx`

- IndexedDB動作確認（発表・単語・履歴）
- テスト手順の実行ログ表示

### `components/DictionaryManagerModal.tsx`

- 辞書エントリの検索・一覧表示
- 一括登録、編集、削除
- `dictionaryApi.ts` との連携

### `components/SettingsModal.tsx`

- ダークモード/テーマカラー設定
- 類似度フィルターON/OFFと強度設定

### `components/HistoryModal.tsx`

- 履歴のモーダル表示
- 履歴削除・再選択

### `components/TermBubble.tsx`

- 単一バブル表示
- ホバー時ツールチップ表示
- ピン留め・オート表示切替

### `components/TermDetailModal.tsx`

- 用語詳細モーダル表示
- コピー・外部リンク遷移

### `components/figma/ImageWithFallback.tsx`

- 画像読み込み失敗時のフォールバック表示

## 運用ルール

- `presentation` 配下へ新規ファイルを追加した場合は、ファイル冒頭コメントで責務を明記する
- 公開関数（または主要ローカル関数）には、処理目的が分かるコメントを付与する
- 仕様に変更が入った場合は本ドキュメントを更新する
