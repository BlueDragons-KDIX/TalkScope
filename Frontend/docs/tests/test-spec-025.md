# test-spec-025: order-013 辞書とバブル表示の分離

## 日付

2026-05-29

## 関連オーダー

- `order-013.md`

## 対象ファイル

- `Frontend/src/stores/bubbleStore.ts`
- `Frontend/src/stores/termStore.ts`
- `Frontend/src/presentation/hooks/useBubbleLifecycle.ts`
- `Frontend/src/presentation/windows/BubbleCloudWindow/index.tsx`
- `Frontend/src/presentation/components/ReferDictScoreSseBridge.tsx`
- `Frontend/src/stores/__tests__/bubbleStore.test.ts`
- `Frontend/src/stores/__tests__/termStore.test.ts`

## テスト項目

| # | テストケース | 種別 | 期待結果 | 結果 |
|---|---|---|---|---|
| 1 | `termStore` 辞書上限 | 単体 | `maxVisibleTerms` 超過でも辞書から追い出さない | ✅ |
| 2 | `termStore` スター枠満杯 | 単体 | 辞書には新規語を追加する | ✅ |
| 3 | `bubbleStore` 表示枠入替 | 単体 | 上限時は最古の非スター語を入れ替える | ✅ |
| 4 | `bubbleStore` スター枠満杯 | 単体 | 表示枠には追加しない（辞書は別ストア） | ✅ |
| 5 | 回帰（ビルド） | ビルド | `npm run build` 成功 | ✅ |

## 手動確認（推奨）

1. SSE で 30 語超を受信し、バブルは上限付近で減るがランキング・文字起こしの語数は減らないこと
2. 全バブルをスターにし、新規語がランキングに載るがバブルに出ないこと
3. グローバルリセットで辞書と表示枠が両方空になること
