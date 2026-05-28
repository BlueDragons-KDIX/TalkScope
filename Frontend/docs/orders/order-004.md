# order-004: 時系列トリガーログウィンドウの追加とMarkdownコピー対応

## 日付

2026-05-29

## 参加者

- ユーザー（担当者）
- Codex

---

## 指示要約

本番環境で利用できるテストツールとして、UIボタン以外のイベント発生タイミングを可視化する新規ウィンドウを追加する。

- 文字起こし文が確定したタイミング
- 上記文がサーバーへ送信されたタイミング
- SSEを受信したタイミング
- フィルタリング完了タイミング
- バブル生成タイミング

加えて、SSE可視化ウィンドウ同様にチェックボックスで表示/非表示を切り替えられること、表示中全項目コピー・項目別コピーをMarkdown形式で行えることを求める。

---

## 実装方針

1. `ReferDictScoreSseBridge` に各トリガーのログ記録ポイントを集約する。
2. 画面描画用に `triggerTimelineStore` を追加し、ログ配列と表示フラグを管理する。
3. 新規ウィンドウ `TriggerTimelineWindow` を `windows` レジストリへ登録する。
4. コピー機能は `navigator.clipboard.writeText` を用い、以下2系統を実装する。
   - 表示中の全項目をMarkdownコピー
   - 各項目セクション単体をMarkdownコピー

---

## 変更ファイル

- `Frontend/src/presentation/components/ReferDictScoreSseBridge.tsx`
- `Frontend/src/presentation/windows/index.ts`
- `Frontend/src/presentation/windows/TriggerTimelineWindow/index.tsx`（新規）
- `Frontend/src/stores/triggerTimelineStore.ts`（新規）
- `Frontend/src/stores/__tests__/triggerTimelineStore.test.ts`（新規）

---

## 補足

- UIボタン操作ログは対象外とし、非UIトリガーのみを記録する。
- ログ表示時刻はミリ秒まで表示し、時系列確認を優先した。
