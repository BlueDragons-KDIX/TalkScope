# test-spec-015: order-003 Step6（bubble-lifecycle）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/presentation/hooks/useBubbleLifecycle.ts`
- `Frontend/src/presentation/App.tsx`
- `Frontend/src/stores/termStore.ts`
- `Frontend/src/stores/__tests__/termStore.test.ts`
- `Frontend/src/stores/termMapWindowSettingsStore.ts`
- `Frontend/src/app/components/BubbleCloud.tsx`
- `Frontend/src/stores/__tests__/termMapWindowSettingsStore.test.ts`

## テストの目的

ブランチ `feature/bubble-lifecycle` の Step6 実装で、バブル削除アルゴリズム（20〜30件のライフタイム管理）が `presentation` 側の共通フックとして動作し、`termStore` の `termTimestamps` と整合して管理されることを確認する。

- 20件以下では削除が発生しない前提の状態管理が維持されること
- 21〜30件の削除候補管理に必要な追加時刻（`termTimestamps`）が保存・削除と同期すること
- 31件以上での即時削除に必要な `removeTermById` 経路が使えること
- リセット時に `termTimestamps` が確実にクリアされること
- バブルウィンドウ内で `maxVisibleTerms`（5〜30）を設定できること
- 表示枠がスター語で埋まっている場合に新規バブルが追加されないこと

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `termStore.addTerms` | 単体 | 追加された用語IDに `termTimestamps` が記録される |
| 2 | `termStore.removeTermById` | 単体 | 用語削除時に対応する timestamp も削除される |
| 3 | `termStore.clearActiveTerms` | 単体 | `activeTerms` と `termTimestamps` を同時にクリアする |
| 4 | `termStore.resetSession` | 単体 | `termTimestamps` を含むセッション状態を初期化する |
| 5 | `useBubbleLifecycle` の組み込み | 実装確認 | `presentation/App.tsx` で1回だけフックがマウントされる |
| 6 | `maxVisibleTerms` スライダー | 実装確認 | バブル設定から5〜30の範囲で上限を変更できる |
| 7 | `termStore.addTerms` 上限制御 | 単体 | 上限到達時は新規追加を抑制する |
| 8 | スター枠満了時の追加抑制 | 単体 | 全表示枠がスターの場合、新規語を追加しない |
| 9 | 回帰テスト | 単体/ビルド | 既存 adapters / ranking / transcription mode を含めて成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/termMapWindowSettingsStore.test.ts src/stores/__tests__/termStore.test.ts src/infrastructure/adapters src/presentation/utils/__tests__/importanceRanking.test.ts src/presentation/hooks/__tests__/transcriptionModeSync.test.ts
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test ...` | 合格 | 33件成功、0件失敗 |
| `bun run build` | 合格 | `tsc -b && vite build` 成功 |
