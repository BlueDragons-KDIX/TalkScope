# test-spec-009: order-003 Step2（score-threshold-filter）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/infrastructure/adapters/ScoreThresholdFilter.ts`
- `Frontend/src/infrastructure/adapters/__tests__/ScoreThresholdFilter.test.ts`
- `Frontend/src/presentation/components/ReferDictScoreSseBridge.tsx`

## テストの目的

ブランチ `feature/score-threshold-filter` の Step2 実装において、SSEで受信した用語をストア反映前にしきい値で除外できることを確認する。

- `DEFAULT_SCORE_THRESHOLD`（0.1）による低スコア除外が機能すること
- `ReferDictScoreSseBridge` で `filterByScore` が適用されること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | デフォルト閾値の除外動作 | 単体 | `score < 0.1` の用語が除外される |
| 2 | 閾値上書き動作 | 単体 | 引数で指定した閾値以上のみ返る |
| 3 | SSEブリッジ配線確認 | 実装確認 | `onTerms` 内で `filterByScore` 後に `addTerms` される |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/infrastructure/adapters
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test src/infrastructure/adapters` | 合格 | 2件成功、0件失敗（Step2範囲） |

## 気づき・注意点

- Step2時点では頻度加算・クリック加算は未導入（Step3/Step4で追加予定）。
- 判定対象は「SSEから受信した生スコア」であり、ストア蓄積後のスコアではない。
