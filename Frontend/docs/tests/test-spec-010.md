# test-spec-010: order-003 Step3（frequency-adapter）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/infrastructure/adapters/DefaultScoreUpdateStrategy.ts`
- `Frontend/src/infrastructure/adapters/FrequencyScoreAdapter.ts`
- `Frontend/src/infrastructure/adapters/__tests__/DefaultScoreUpdateStrategy.test.ts`
- `Frontend/src/infrastructure/adapters/__tests__/FrequencyScoreAdapter.test.ts`
- `Frontend/src/presentation/components/ReferDictScoreSseBridge.tsx`

## テストの目的

ブランチ `feature/frequency-adapter` の Step3 実装において、同一用語の再出現時に `term.score` へ頻度加算できることを確認する。

- 初出は `toAdd`、2回目以降は `toUpdate` に振り分けられること
- `DefaultScoreUpdateStrategy` の既定加算量が意図どおりであること
- `ReferDictScoreSseBridge` が `filterByScore` 後に頻度アダプタを経由すること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `DefaultScoreUpdateStrategy` の加算動作 | 単体 | `onFrequency` と `onClick` が固定量加算する |
| 2 | `FrequencyScoreAdapter` の初出・再出現判定 | 単体 | 初出は `toAdd`、再出現は `toUpdate` |
| 3 | `FrequencyScoreAdapter.reset` | 単体 | カウントが初期化され再び初出扱いになる |
| 4 | SSEブリッジ配線確認 | 実装確認 | `filterByScore` 後に `adapter.adapt` と `updateTermScore` が呼ばれる |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/infrastructure/adapters
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test src/infrastructure/adapters` | 合格 | 7件成功、0件失敗 |

## 気づき・注意点

- Step3 では頻度加算のみ導入し、クリック加算の統一は Step4 で実施する。
- セッションリセット時は `ReferDictScoreSseBridge` 内の `adapter.reset()` でカウントを初期化する。
