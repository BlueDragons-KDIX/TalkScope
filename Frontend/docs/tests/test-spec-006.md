# test-spec-006: Term category / score（難易度ランク）廃止

## 日付

2026-05-20

## 対象ファイル

- `Frontend/src/domain/entities/Term.ts`
- `Frontend/src/domain/entities/__tests__/Term.test.ts`
- `Frontend/src/stores/termStore.ts`
- `Frontend/src/stores/__tests__/termStore.test.ts`
- `Frontend/src/app/data/terms.ts`
- `Frontend/src/app/hooks/useReferDict.ts`
- `Frontend/src/app/components/TermDetailPanel.tsx`
- `Frontend/src/app/components/TermDetailModal.tsx`
- `Frontend/src/app/components/TermBubble.tsx`
- `Frontend/src/app/components/TranscriptionView.tsx`
- `Frontend/src/app/components/__tests__/TermDetailPanel.test.tsx`
- `Frontend/src/presentation/utils/importanceRanking.ts`
- `Frontend/src/presentation/utils/__tests__/importanceRanking.test.ts`
- `Frontend/src/presentation/windows/ImportanceRankingWindow/index.tsx`
- `Frontend/src/app/db/schema.ts`

## テストの目的

ブランチ `feature/important-term-schema-update` における以下を検証する。

- `level` → `score` へのリネーム後も、既存の注入・ランキング・詳細表示が破綻しないこと
- `category` が `addTerms` で常に空文字に正規化されること
- 初級/中級/上級（`Term.score` に基づくランク表示）が UI から消え、重要度算出に `term.score` が使われないこと

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `normalizeTermCategory` | 単体 | null / 任意文字列 → `''` |
| 2 | `addTerms` の category 正規化 | 単体 | 注入後 `activeTerms[].category === ''` |
| 3 | `TermDetailPanel` に category 非表示 | 単体 | `AI/Data` 等のラベルが DOM に無い |
| 4 | `importanceRanking` 降順ソート | 単体 | 頻度・クリックに基づく `RankedTerm.score` の降順 |
| 5 | 全体テスト | 結合 | `bun test` 全件成功 |
| 6 | 全体ビルド | 結合 | `bun run build` 成功 |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test` | 合格 | 76 件成功、0 件失敗 |
| `bun run build` | 合格 | `app/data/terms.ts` の `category: string` 揃え後 |

`bun test` の内訳:

| 項目 | 件数 |
|------|------|
| 総テスト数 | 76 |
| 成功 | 76 |
| 失敗 | 0 |
| expect 呼び出し | 132 |
| テストファイル数 | 19 |

## 気づき・注意点

- `RankedTerm.score`（ランキング合成値）と `Term.score`（廃止した難易度フィールド）は名前が同じで概念が異なる。ADR-009 を参照。
- 手動確認: 詳細ウィンドウ・文字起こしホバー・バブルツールチップに初級/中級/上級および `Score.N` が出ないこと。
- 関連 ADR: `adr-009.md`
