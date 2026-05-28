# test-spec-015: order-003 Step6（bubble-lifecycle）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/presentation/hooks/useBubbleLifecycle.ts`
- `Frontend/src/presentation/App.tsx`
- `Frontend/src/stores/termStore.ts`
- `Frontend/src/stores/__tests__/termStore.test.ts`

## テストの目的

ブランチ `feature/bubble-lifecycle` の Step6 実装で、バブル削除アルゴリズム（20〜30件のライフタイム管理）が `presentation` 側の共通フックとして動作し、`termStore` の `termTimestamps` と整合して管理されることを確認する。

- 20件以下では削除が発生しない前提の状態管理が維持されること
- 21〜30件の削除候補管理に必要な追加時刻（`termTimestamps`）が保存・削除と同期すること
- 31件以上での即時削除に必要な `removeTermById` 経路が使えること
- リセット時に `termTimestamps` が確実にクリアされること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `termStore.addTerms` | 単体 | 追加された用語IDに `termTimestamps` が記録される |
| 2 | `termStore.removeTermById` | 単体 | 用語削除時に対応する timestamp も削除される |
| 3 | `termStore.clearActiveTerms` | 単体 | `activeTerms` と `termTimestamps` を同時にクリアする |
| 4 | `termStore.resetSession` | 単体 | `termTimestamps` を含むセッション状態を初期化する |
| 5 | `useBubbleLifecycle` の組み込み | 実装確認 | `presentation/App.tsx` で1回だけフックがマウントされる |
| 6 | 回帰テスト | 単体/ビルド | 既存 adapters / ranking / transcription mode を含めて成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/termStore.test.ts src/infrastructure/adapters src/presentation/utils/__tests__/importanceRanking.test.ts src/presentation/hooks/__tests__/transcriptionModeSync.test.ts
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test ...` | 合格 | 27件成功、0件失敗 |
| `bun run build` | 合格 | `tsc -b && vite build` 成功 |
