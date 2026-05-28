# test-spec-014: order-003 Step5（score-based-rendering）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/app/components/BubbleCloud.tsx`
- `Frontend/src/presentation/windows/BubbleCloudWindow/index.tsx`
- `Frontend/src/presentation/windows/ImportanceRankingWindow/index.tsx`
- `Frontend/src/presentation/windows/TranscriptionWindow/index.tsx`
- `Frontend/src/presentation/utils/importanceRanking.ts`
- `Frontend/src/stores/termStore.ts`

## テストの目的

ブランチ `feature/score-based-rendering` の Step5 実装で、描画ロジックを `term.score` 参照へ統一し、旧シグナル（`termClickWeights` / `countTermFrequencies`）依存を削除できていることを確認する。

- バブルサイズが `term.score` ベースで更新されること
- 重要度ランキングが `term.score` 降順で表示されること
- `termStore` から `termClickWeights` / `incrementClickWeight` が除去されていること
- Step4 までのクリック同期が `updateTermScore` 経由で継続すること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | BubbleCloud のサイズ計算 | 実装確認 | `scoreMult = 1 + term.score * SCORE_SCALE_FACTOR` が使われる |
| 2 | BubbleCloudWindow の依存削除 | 実装確認 | `termFrequencies` / `termClickWeights` を参照しない |
| 3 | ImportanceRankingWindow の依存削除 | 実装確認 | `countTermFrequencies` / `termClickWeights` を使わず `rankTermsByImportance(terms)` を使う |
| 4 | TranscriptionWindow のクリック処理 | 実装確認 | `incrementClickWeight` なしで `onScoreClick` のみ呼ぶ |
| 5 | termStore の状態構造 | 実装確認 | `termClickWeights` / `incrementClickWeight` が存在しない |
| 6 | 回帰テスト | 単体/ビルド | 対象テストと `bun run build` が成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/termStore.test.ts src/infrastructure/adapters src/presentation/utils/__tests__/importanceRanking.test.ts
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test ...` | 合格 | 21件成功、0件失敗 |
| `bun run build` | 合格 | `tsc -b && vite build` 成功 |
