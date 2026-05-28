# test-spec-008: order-003 Step1（sse-foundation）検証

## 日付

2026-05-28

## 対象ファイル

- `Frontend/src/domain/interfaces/IScoreUpdateStrategy.ts`
- `Frontend/src/domain/interfaces/index.ts`
- `Frontend/src/stores/termStore.ts`
- `Frontend/src/stores/__tests__/termStore.test.ts`

## テストの目的

ブランチ `feature/sse-foundation` の Step1 実装において、以降のスコア一元化で必要になる土台が正しく導入されていることを確認する。

- スコア更新戦略インターフェース（`IScoreUpdateStrategy`）が定義・公開されていること
- `termStore` に `updateTermScore` が追加され、対象IDの `term.score` を更新できること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `IScoreUpdateStrategy` の公開 | 単体 | `domain/interfaces/index.ts` から参照可能 |
| 2 | `updateTermScore` の更新動作 | 単体 | 対象IDの `score` のみ更新される |
| 3 | 既存 store テストの回帰 | 単体 | 既存ケースがすべて成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test src/stores/__tests__/termStore.test.ts
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test src/stores/__tests__/termStore.test.ts` | 合格 | 12件成功、0件失敗 |

## 気づき・注意点

- Step1 は「スコア更新の口」を作る段階であり、しきい値フィルタ・頻度加算・クリック加算・描画切替はこの時点では未導入。
- `order-003` の Step2 以降で `IScoreUpdateStrategy` と `updateTermScore` を利用して機能を段階的に接続する。
