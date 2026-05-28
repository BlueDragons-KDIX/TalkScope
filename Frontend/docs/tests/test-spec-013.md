# test-spec-013: order-003 Step4（click-score-service）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/presentation/hooks/useScoreUpdate.ts`
- `Frontend/src/presentation/windows/BubbleCloudWindow/index.tsx`
- `Frontend/src/presentation/windows/ImportanceRankingWindow/index.tsx`
- `Frontend/src/presentation/windows/TranscriptionWindow/index.tsx`

## テストの目的

ブランチ `feature/click-score-service` の Step4 実装において、クリック起点のスコア加算を `useScoreUpdate` へ統一し、各ウィンドウで同じ更新経路を通ることを確認する。

- クリック時に `updateTermScore` が呼ばれること
- ピン留め単語は `useScoreUpdate` 内でスコア更新をスキップすること
- Step4時点では `termClickWeights` を残したまま共存できること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `useScoreUpdate` の導入 | 実装確認 | 3ウィンドウが共通フック経由でスコア更新する |
| 2 | BubbleCloudWindow クリック挙動 | 実装確認 | 既存の `incrementClickWeight` と `onScoreClick` が両方動く |
| 3 | ImportanceRankingWindow / TranscriptionWindow | 実装確認 | 選択・履歴追加に加えて `onScoreClick` が呼ばれる |
| 4 | 回帰テスト | 単体 | termStore / adapters / transcription mode の既存テスト成功 |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/termStore.test.ts src/infrastructure/adapters src/presentation/hooks/__tests__/transcriptionModeSync.test.ts
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test ...` | 合格 | 23件成功、0件失敗 |
| `bun run build` | 合格 | `tsc -b && vite build` 成功 |
