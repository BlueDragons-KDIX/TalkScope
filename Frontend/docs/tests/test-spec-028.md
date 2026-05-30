# test-spec-028: フィルター閾値 0.42 とバブルサイズ感度（order-016）

## 日付

2026-05-29

## 対象

- `ScoreThresholdFilter.ts`
- `bubbleSizeFromScore.ts`
- `DefaultScoreUpdateStrategy.ts`
- `BubbleCloud.tsx`

## テスト項目

| # | ケース | 期待 | 結果 |
|---|--------|------|------|
| 1 | デフォルト閾値 | `score >= 0.42` のみ通過 | ✅ |
| 2 | 重要度レベル | 0.42→1, 0.45→4 | ✅ |
| 3 | 半径の段差 | 0.42 と 0.43 で 6px 差 | ✅ |
| 4 | クリック加算 | +0.01 | ✅ |
| 5 | ビルド | `npm run build` | ✅ |

## コマンド

```bash
cd Frontend
bun test src/infrastructure/adapters/__tests__/bubbleSizeFromScore.test.ts \
  src/infrastructure/adapters/__tests__/ScoreThresholdFilter.test.ts \
  src/infrastructure/adapters/__tests__/DefaultScoreUpdateStrategy.test.ts
```
