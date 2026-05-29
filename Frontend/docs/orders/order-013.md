# order-013: 重要単語辞書とバブル表示状態の分離・パフォーマンス上限の決定

## 日付

2026-05-28（初版） / 2026-05-29（現行コードに合わせて改訂）

## 参加者

- ユーザー（担当者）
- Claude（初版）
- Codex（改訂・妥当性レビュー）

## 関連ドキュメント

| ドキュメント | 関係 |
|---|---|
| `order-003.md` Step 6 | バブル削除を `termStore` + `useBubbleLifecycle` で実装済み（**本オーダーで設計を修正**） |
| `test-spec-015.md` | Step 6 の検証記録（実装変更後は追補または新 spec が必要） |
| `ADR-007` 等 | グローバルリセット時の `bubbleStore.clearBubbles()` は既に配線済み |

---

## 概要

Step 6 実装後に発覚した「バブル上限がランキング・文字起こしまで縮む」不具合の原因分析と修正方針、および重要単語辞書（`termStore.activeTerms`）のパフォーマンス上限の調査結果をまとめる。

**本オーダーは新機能追加ではなく、Step 6 の責務分離リファクタリングである。**

---

## 現状コードの整理（2026-05-29 時点）

| コンポーネント | 実際の状態 |
|---|---|
| `useBubbleLifecycle` | `App.tsx` でマウント済み。1 秒ごとに **`termStore.removeTermById`** を呼ぶ（バグの直接原因） |
| `bubbleStore` | **存在・部分接続**。`clearBubbles` はリセット / フェーズ遷移で使用。**表示には未使用** |
| `bubbleStore.pruneExpired` | 実装あるが **未呼び出し** |
| `BubbleCloudWindow` | `termStore.activeTerms` をそのまま `BubbleCloud` に渡している |
| `termStore.addTerms` | `maxVisibleTerms`（バブル設定 5〜30）到達時に **辞書から最古の非スター語を追い出す**（別経路の同種バグ） |
| `ReferDictScoreSseBridge` | `addTerms` / `updateTermScore` のみ。`bubbleStore` には触れない |

初版の「`bubbleStore` は未接続」は **不正確**。未接続なのは **バブル表示パス** であり、ストア自体はリセット系で使われている。

---

## バグ報告

### 現象

- バブルのライフタイム（`useBubbleLifecycle`）により `termStore.removeTermById` が走ると、`ImportanceRankingWindow` と `TranscriptionWindow` からも同じ単語が消える
- バブル上限（`maxVisibleTerms` 5〜30）が、**辞書追加時**（`addTerms` の入れ替え）と **ライフタイム削除** の両方でランキング・文字起こしの件数に影響する

### 根本原因

```
termStore.activeTerms（1 つの配列＝セッション辞書）
  ├─ BubbleCloudWindow      … 全件表示（本来は表示枠だけ絞るべき）
  ├─ ImportanceRankingWindow … 全件参照
  └─ TranscriptionWindow    … 全件マーキング

削除経路 A: useBubbleLifecycle → removeTermById()
削除経路 B: addTerms() が maxVisibleTerms 超過で最古語を splice 削除
  └─ いずれも辞書から消える → 全ウィンドウから消える
```

**「セッション中の重要単語辞書」と「バブルに出す表示枠」が同じ `activeTerms` と同じ上限設定で管理されている**ことが原因。

### 用語の整理

| 用語 | 意味 |
|---|---|
| 辞書 | `termStore.activeTerms`。セッション中は **ライフタイムでは削除しない**（リセット・デモ除去・明示 API のみ） |
| 表示枠 | バブルに載せる ID 集合。件数上限・5 秒猶予・即時溢れ削除は **こちらだけ** に適用 |

---

## 修正方針

### 決定: `bubbleStore` に表示対象 ID のみ持たせる（Term コピーは持たない）

`bubbleStore` の `bubbles: Bubble[]` をやめ、**表示対象の termId とバブル用タイムスタンプ**だけを管理する。スコア更新は `termStore.updateTermScore` の 1 箇所に集約する。

#### データ構造（目標）

```
termStore.activeTerms + termTimestamps
  ├─ ImportanceRankingWindow  … 変更なし（辞書全件）
  ├─ TranscriptionWindow      … 変更なし（辞書全件）
  └─ スコア更新・ピン・履歴   … 変更なし

bubbleStore
  visibleTermIds: string[]          … 表示対象（順序は timestamps で決める）
  bubbleTimestamps: Record<id, ms>  … 追加時刻（溢れ・猶予判定用）
  └─ BubbleCloudWindow
        activeTerms.filter(t => visibleTermIds.includes(t.id))
```

> **実装メモ:** Zustand の state に `Set` をそのまま置くとイミュータブル更新でハマりやすい。`string[]` + `includes`、または更新時に毎回 `new Set(...)` する方針を推奨する。

#### データフロー（目標）

```
SSE 受信（ReferDictScoreSseBridge.onTerms）
  ├─ termStore.addTerms()              … 辞書へ追加（上限による追い出しは行わない）
  ├─ termStore.updateTermScore()       … 既存語のスコア更新
  └─ bubbleStore.addVisibleTermId()    … 新規追加語のみ表示枠へ（toAdd 分）

1 秒ごと（useBubbleLifecycle を書き換え）
  ├─ hardLimit / softLimit ← termMapWindowSettingsStore.maxVisibleTerms
  ├─ 溢れ・5 秒猶予・ピン留め除外 ← bubbleStore 上で実施
  └─ termStore.removeTermById は呼ばない

クリック・頻度加算
  └─ termStore.updateTermScore() のみ

グローバルリセット / 発表終了
  ├─ termStore.resetSession()（既存）
  └─ bubbleStore.clearVisible()（API 名は実装時に統一）
```

#### Term コピーを `bubbleStore` に持たせない理由

`updateTermScore` が `termStore` と `bubbleStore` の両方を更新する必要が生じ、同期ズレのリスクがあるため不採用（初版方針を維持）。

#### `termStore.addTerms` の上限追い出しをやめる理由

`maxVisibleTerms` は **バブル表示枠** の設定である。辞書側で同じ上限を適用すると、バブルを出していない語までランキング・文字起こしから消える。  
追加時の `while (length >= maxVisibleTerms)` による splice 削除は **削除する**。

辞書が無制限に伸びる懸念は「パフォーマンス上限」節のとおり、実運用規模では問題にならない想定。将来必要なら **辞書専用** のソフトリミットを別定数で切る（`maxVisibleTerms` とは別キー）。

#### `useBubbleLifecycle` の扱い

- **新規に `App.tsx` に prune 用 hook を足す案は採用しない**（既に `useBubbleLifecycle` が存在するため）
- 中身を `bubbleStore` 操作に差し替え、death row 用 `useRef` はバブル ID 基準のまま流用可能
- `pinnedTermIds` の除外・スター枠満了時の追加抑制は **表示枠側** で再現する（Step 6 仕様の維持）

| Step 6 仕様 | 適用先（修正後） |
|---|---|
| `maxVisibleTerms`（5〜30） | `bubbleStore` の hardLimit |
| `softLimit = min(20, hardLimit)` | `bubbleStore` |
| 5 秒猶予（death row） | `useBubbleLifecycle` + `bubbleTimestamps` |
| 非スター最古から即時削除（溢れ） | `bubbleStore` |
| スター枠満了で新規を辞書に入れない | **`addTerms` では入れる** / **`addVisibleTermId` で表示だけ抑制**（決定済み） |

> **決定（2026-05-29）:** スター枠満了時は **辞書には登録**し、**バブル表示枠だけ追加しない**（`addVisibleTermId` が `false` を返す）。

---

## 変更が必要なファイル

| ファイル | 変更内容 |
|---|---|
| `src/stores/bubbleStore.ts` | `bubbles` 廃止 → `visibleTermIds` + `bubbleTimestamps`。`addVisibleTermId` / `removeVisibleTermId` / `clearVisible`（名称は実装で統一） |
| `src/presentation/hooks/useBubbleLifecycle.ts` | `removeTermById` をやめ `bubbleStore` の溢れ・猶予処理に移す |
| `src/stores/termStore.ts` | `addTerms` から `maxVisibleTerms` による追い出しを削除 |
| `src/presentation/windows/BubbleCloudWindow/index.tsx` | 辞書を `visibleTermIds` でフィルタして `BubbleCloud` に渡す |
| `src/presentation/components/ReferDictScoreSseBridge.tsx` | `toAdd` 後に `addVisibleTermId`（パスは `infrastructure/sse` から re-export） |
| `src/presentation/App.tsx` | 変更は最小（リセットで `clearVisible` を呼ぶだけの可能性） |
| `src/stores/__tests__/termStore.test.ts` | 辞書上限追い出しテストの期待値を修正 |
| `src/stores/__tests__/bubbleStore.test.ts` | 新規または拡充（表示枠・prune・溢れ） |
| `src/presentation/components/ReferDictScoreSseBridge.tsx` | デバッグ用 `setBubbleTerms` の購読元を表示枠ベースに変更（任意だが推奨） |

**変更なし（ロジック面）:** `ImportanceRankingWindow` / `TranscriptionWindow`（辞書全件参照のまま）。

**ドキュメント追従:** `test-spec-015.md` に改訂注記、または `test-spec-025.md` を新設。

---

## ライフタイム定数

| 定数 | 値 | 適用先（修正後） |
|---|---|---|
| `MAX_BUBBLES` / hardLimit | `maxVisibleTerms`（設定 5〜30、既定 30） | `bubbleStore` + `useBubbleLifecycle` |
| `SOFT_LIMIT` | `min(20, hardLimit)` | 同上 |
| `SOFT_LIFESPAN_MS` | 5,000ms | 同上（`bubbleTimestamps` 基準） |

`bubbleStore.ts` 内の固定 `30` / `20` は、設定値を読むよう **統合する**（二重定義を避ける）。

---

## 重要単語辞書のパフォーマンス上限

### ボトルネック分析

#### `updateTermScore`（最頻出）

```typescript
activeTerms: state.activeTerms.map(t =>
  t.id === id ? { ...t, score } : t
)
```

| 単語数 | map() 1回（目安） | 1秒に10回更新 |
|---|---|---|
| 500 | 〜0.01ms | 〜0.1ms/秒 |
| 2,000 | 〜0.04ms | 〜0.4ms/秒 |
| 5,000 | 〜0.1ms | 〜1ms/秒 |
| 10,000 | 〜0.2ms | 〜2ms/秒 |

計算コスト自体は問題になりにくい。

#### Zustand 再レンダリング（実際の主ボトルネック）

`updateTermScore` のたびに `activeTerms` の参照が変わり、購読コンポーネントが再レンダリング判定される。**呼び出し頻度**の影響が単語数より大きい。`ImportanceRankingWindow` は `useThrottledValue(160ms)` で緩和済み。

#### ランキングのソート

throttle あり。5,000 語でも 〜0.8ms 程度（目安）。

### 実運用の単語数（目安）

| セッション | 想定ユニーク語数 |
|---|---|
| 30分の発表 | 50〜150 |
| 1時間の講義 | 100〜300 |
| 3時間 | 200〜600 |

### 決定事項

| 項目 | 決定 |
|---|---|
| 辞書（`activeTerms`）の件数上限 | **ライフタイムでは設けない**。`addTerms` の `maxVisibleTerms` 追い出しは **廃止** |
| 表示枠 | 既存 UI の `maxVisibleTerms`（5〜30）を **bubbleStore のみ** に適用 |
| パフォーマンス上の余裕 | 辞書 2,000〜3,000 語程度までは現状の map 更新で十分な見込み |
| 将来の保険 | 必要なら辞書専用ソフトリミット（500〜1,000）を **別設定** で検討。`maxVisibleTerms` と混同しない |

---

## 完了条件

- [ ] バブル猶予・溢れ削除後も、ランキング・文字起こしに語が残る
- [ ] `maxVisibleTerms` を下げても、辞書全件はランキングに反映される（表示枠のみ減る）
- [ ] ピン留め語は表示枠の削除候補から除外される
- [ ] グローバルリセットで辞書と表示枠の両方が空になる
- [ ] `npm run build` および `termStore` / `bubbleStore` 関連単体テストが成功する

---

## 未決事項・保留

- ブランチ名: `feature/bubble-store-separation` 等（`feature/bubble-lifecycle` は Step 6 完了済みのため流用しない方がよい）
- ~~スター枠満了時~~ → **辞書登録・バブル非表示**（実装済み方針）
- `visibleTermIds` 溢れ時の削除優先: **追加時刻が古い非スター語から**（現行 `bubbleStore.upsertBubble` と同様）
- `removeTermById` API 自体はデモ除去等で残すか、使用箇所を grep して整理

---

## 次のアクション

1. 本オーダーに沿ったブランチで `bubbleStore` リファクタ + `useBubbleLifecycle` 差し替え + `termStore.addTerms` 修正
2. `test-spec-015` を改訂するか `test-spec-025` で「辞書は残る」回帰を追加
3. 手動確認: 30 語超のセッションでバブルだけ減り、ランキング件数は減らないこと
