# order-003: スコア計算アダプタの実装とスコア一元化リファクタリング

## 日付
2026-05-28

## 参加者
- ユーザー（担当者）
- Claude

---

## 概要

SSEから受け取ったサーバースコアを、フロント側で出現頻度・クリックによって動的に加算し、  
バブルと重要度ランキングの描画に反映させる。  
合わせて `term.score` を **唯一の重要度の源泉** とし、モックベクトルや分散した計算ロジックを撤廃する。

---

## 背景・現状の問題

### バックエンドのSSE送信型

```python
# app/schemas/dictionary.py
class ResponseTermScore(BaseModel):
    term: str         # 単語
    description: str  # 説明
    score: float      # テーマ類似度 + IDF の合算スコア
    source: str       # "db" or "llm"
```

`id` フィールドは存在しない。フロントの `TermRow.id` は常に `undefined`。  
`TermMapper` が `word + "-" + desc.slice(0, 5)` で自前生成している。

### フロントの現状フロー

```
SSE → parseTermRowsFromEventData → TermRow[]
  → mapToTerms() → Term[] (score はそのまま格納)
  → addTerms() → termStore.activeTerms
  → BubbleCloud / ImportanceRankingWindow が参照
```

### 問題点

| 問題 | 内容 |
|---|---|
| `term.score` が未使用 | ストアに保持されるが、バブルサイズ・ランキングのどちらにも参照されていない |
| モックベクトルで類似度計算 | `getMockTermVector` 等によるランダムなコサイン類似度が `similarityMult` に使われており意味がない |
| 頻度計算がtranscript全文スキャン | `countTermFrequencies` が毎回 transcript を regex でスキャンしており非効率 |
| スコア信号が分散 | `termClickWeights`（クリック）/ `termFrequencies`（regex頻度）/ `term.score`（SSE）の3系統が別管理 |
| `app/App.tsx` はデッドコード | `main.tsx` は `presentation/App.tsx` のみを使用。旧 App.tsx は未使用 |
| バブル削除アルゴリズム未移行 | 旧 App.tsx にあった 20〜30件のライフタイム管理が新システムに存在しない |

### スコアの意味

サーバースコアはテーマとの **コサイン類似度をベースにした重要度**（IDF補正込み）。  
フロントでのベクトル計算は不要で、スコアが高い単語 = 類似度が高い重要単語。

---

## 設計方針

### `term.score` を唯一の重要度の源泉にする

```
term.score の構成:
  SSEの生スコア（サーバー計算）
  + 頻度加算（2回目以降に FrequencyScoreAdapter が加算）
  + クリック加算（useScoreUpdate が加算）
```

バブルサイズ・ランキングはすべて `term.score` を参照する。  
`termClickWeights` / `termFrequencies` はこのリファクタリング完了後に削除する。

### デコレータパターン

スコア加算ロジックは差し替え可能な Strategy として実装する。

```
SSE TermRow[]
  → mapToTerms() → Term[]
  → ScoreThresholdFilter   （Step 2）
  → FrequencyScoreAdapter  （Step 3）
  → addTerms / updateTermScore → termStore
```

---

## ステップ一覧

| Step | ブランチ | 内容 |
|---|---|---|
| 1 | `feature/sse-foundation` | ストア拡張・インターフェース定義 |
| 2 | `feature/score-threshold-filter` | 低スコア単語フィルタ |
| 3 | `feature/frequency-adapter` | 頻度計算アダプタ |
| 4 | `feature/click-score-service` | クリックスコア更新のサービス化 |
| 5 | `feature/score-based-rendering` | 描画を `term.score` に切り替え |
| 6 | `feature/bubble-lifecycle` | バブル削除アルゴリズム |

---

## Step 1: ストア拡張・インターフェース定義
**ブランチ: `feature/sse-foundation`**

### termStore に追加

```typescript
// src/stores/termStore.ts

updateTermScore: (id: string, score: number) => void
```

実装:
```typescript
updateTermScore: (id, score) => set((state) => ({
  activeTerms: state.activeTerms.map(t =>
    t.id === id ? { ...t, score } : t
  ),
})),
```

### IScoreUpdateStrategy インターフェース定義

```typescript
// src/domain/interfaces/IScoreUpdateStrategy.ts

export interface IScoreUpdateStrategy {
  /** 頻度加算: 現在スコアと出現回数から新スコアを返す */
  onFrequency(currentScore: number, count: number): number
  /** クリック加算: 現在スコアから新スコアを返す */
  onClick(currentScore: number): number
}
```

### 変更ファイル

- `src/stores/termStore.ts`（`updateTermScore` 追加）
- `src/domain/interfaces/IScoreUpdateStrategy.ts`（新規）
- `src/domain/interfaces/index.ts`（export 追加）

---

## Step 2: 低スコア単語フィルタ
**ブランチ: `feature/score-threshold-filter`**

### 目的

サーバーからはジャンルを絞らず単語が送られてくる。  
スコアが一定値未満の単語（類似度が低い＝関連性が薄い）はフロントで弾く。

### 差し込み位置

```
mapToTerms() → Term[]
  → [ScoreThresholdFilter] ← ここ（SSE生スコアで判定）
  → FrequencyScoreAdapter
```

頻度計算の前にフィルタすることで、頻度マップを汚染しない。

### 実装

```typescript
// src/infrastructure/adapters/ScoreThresholdFilter.ts

export const DEFAULT_SCORE_THRESHOLD = 0.1

export function filterByScore(
  terms: Term[],
  threshold: number = DEFAULT_SCORE_THRESHOLD,
): Term[] {
  return terms.filter(t => t.score >= threshold)
}
```

注意: ここで見るのは **SSEから来た生スコア**（ストアに蓄積されたスコアではない）。

### ReferDictScoreSseBridge への差し込み

```typescript
// src/presentation/components/ReferDictScoreSseBridge.tsx

onTerms: (terms) => {
  const filtered = filterByScore(terms)
  useTermStore.getState().addTerms(filtered)
}
```

### 変更ファイル

- `src/infrastructure/adapters/ScoreThresholdFilter.ts`（新規）
- `src/presentation/components/ReferDictScoreSseBridge.tsx`

---

## Step 3: 頻度計算アダプタ
**ブランチ: `feature/frequency-adapter`**

### FrequencyScoreAdapter

```typescript
// src/infrastructure/adapters/FrequencyScoreAdapter.ts

export class FrequencyScoreAdapter {
  private counts = new Map<string, number>()

  constructor(private strategy: IScoreUpdateStrategy) {}

  adapt(terms: Term[]): {
    toAdd: Term[]
    toUpdate: { id: string; score: number }[]
  } {
    const toAdd: Term[] = []
    const toUpdate: { id: string; score: number }[] = []

    for (const term of terms) {
      const prev = this.counts.get(term.id) ?? 0
      const next = prev + 1
      this.counts.set(term.id, next)

      if (prev === 0) {
        // 初出: そのまま追加
        toAdd.push(term)
      } else {
        // 2回目以降: スコア加算して更新
        const currentScore = useTermStore.getState().activeTerms
          .find(t => t.id === term.id)?.score ?? term.score
        const newScore = this.strategy.onFrequency(currentScore, next)
        toUpdate.push({ id: term.id, score: newScore })
      }
    }

    return { toAdd, toUpdate }
  }

  reset(): void {
    this.counts.clear()
  }
}
```

### デフォルト計算式（差し替え可能）

```typescript
// src/infrastructure/adapters/DefaultScoreUpdateStrategy.ts

export const FREQUENCY_DELTA = 0.05
export const CLICK_DELTA = 0.1

export class DefaultScoreUpdateStrategy implements IScoreUpdateStrategy {
  onFrequency(currentScore: number, _count: number): number {
    // 線形加算（countは将来の対数式等への拡張用に引数として保持）
    return currentScore + FREQUENCY_DELTA
  }

  onClick(currentScore: number): number {
    return currentScore + CLICK_DELTA
  }
}
```

### ReferDictScoreSseBridge への差し込み

```typescript
// src/presentation/components/ReferDictScoreSseBridge.tsx

const adapter = new FrequencyScoreAdapter(new DefaultScoreUpdateStrategy())

onTerms: (terms) => {
  const filtered = filterByScore(terms)
  const { toAdd, toUpdate } = adapter.adapt(filtered)
  const store = useTermStore.getState()
  store.addTerms(toAdd)
  toUpdate.forEach(({ id, score }) => store.updateTermScore(id, score))
}
```

アダプタはブリッジコンポーネントのライフサイクルと同期させ、セッションリセット時に `adapter.reset()` を呼ぶ。

### 変更ファイル

- `src/infrastructure/adapters/FrequencyScoreAdapter.ts`（新規）
- `src/infrastructure/adapters/DefaultScoreUpdateStrategy.ts`（新規）
- `src/presentation/components/ReferDictScoreSseBridge.tsx`

---

## Step 4: クリックスコア更新のサービス化
**ブランチ: `feature/click-score-service`**

### useScoreUpdate フック

```typescript
// src/presentation/hooks/useScoreUpdate.ts

export function useScoreUpdate() {
  const onClick = useCallback((termId: string) => {
    const store = useTermStore.getState()
    const term = store.activeTerms.find(t => t.id === termId)
    if (!term) return
    // ピン留め済みはスコアを変化させない
    if (store.pinnedTermIds.has(termId)) return
    const newScore = strategy.onClick(term.score)
    store.updateTermScore(termId, newScore)
  }, [])

  return { onClick }
}
```

`strategy` は `DefaultScoreUpdateStrategy` のシングルトンを参照する（将来 DI に変更可能）。

### 各ウィンドウへの適用

```typescript
// BubbleCloudWindow, ImportanceRankingWindow, TranscriptionWindow 共通

const { onClick: onScoreClick } = useScoreUpdate()

const handleTermClick = (term: Term) => {
  selectTerm(term)
  addToHistory(term)
  onScoreClick(term.id)   // ← useScoreUpdate 経由に統一
}
```

この時点では `termClickWeights` / `incrementClickWeight` はまだ残す（Step 5 で削除）。

### 変更ファイル

- `src/presentation/hooks/useScoreUpdate.ts`（新規）
- `src/presentation/windows/BubbleCloudWindow/index.tsx`
- `src/presentation/windows/ImportanceRankingWindow/index.tsx`
- `src/presentation/windows/TranscriptionWindow/index.tsx`

---

## Step 5: 描画を `term.score` に切り替え
**ブランチ: `feature/score-based-rendering`**

### BubbleCloud のサイズ計算変更

**削除するもの:**
- `themeVector` / `termVectors` / `themeText` props
- `getMockTermVector` / `getMockThemeVector` / `getMockConversationVector` の import・使用
- `similarityMult` の計算（`(1 + 0.6 * themeScore) * (1 + convScore)`）
- `termFrequencies` prop
- `freqMult` の計算（`1 + 0.12 * Math.min(freq, 10)`）
- `termWeights` prop（`termClickWeights` から来ていたもの）

**変更後のサイズ計算:**
```typescript
const SCORE_SCALE_FACTOR = 3.0  // term.score=1.0 のときに十分大きくなるよう調整

const score = term.score       // Step 1〜4 で蓄積されたスコア
const baseR = 20               // 固定最小半径
const scoreMult = 1 + score * SCORE_SCALE_FACTOR  // スコアで倍率を決める

let r = baseR * scaleFactor * scoreMult
r = Math.min(r, 95)            // 上限 95px（既存と同じ）
r = r * effectiveBubbleScale   // ユーザー設定倍率（既存と同じ）
r = Math.max(r, 20)            // 下限 20px（既存と同じ）
```

ピン留めバブルは `r = 38 * scaleFactor` で固定（既存と同じ）。

### BubbleCloudWindow の変更

```typescript
// 削除
const termFrequencies = useMemo(...)   // countTermFrequencies 呼び出し
const termClickWeights = useTermStore(s => s.termClickWeights)
const incrementClickWeight = useTermStore(s => s.incrementClickWeight)

// BubbleCloud へのprop から削除
termWeights={termClickWeights}
termFrequencies={termFrequencies}
```

### ImportanceRankingWindow の変更

```typescript
// 削除
const throttledWeights = useThrottledValue(termClickWeights, ...)
const termFrequencies = useMemo(() => countTermFrequencies(...), ...)

// ランキング計算を term.score 参照に
const ranked = useMemo(() => {
  return [...throttledTerms]
    .sort((a, b) => b.score - a.score)
    .map((term, i) => ({ term, score: term.score, rank: i + 1 }))
}, [throttledTerms])
```

### termStore から削除

```typescript
// 削除
termClickWeights: Record<string, number>
incrementClickWeight: (termId: string) => void
```

### 変更ファイル

- `src/app/components/BubbleCloud.tsx`
- `src/presentation/windows/BubbleCloudWindow/index.tsx`
- `src/presentation/windows/ImportanceRankingWindow/index.tsx`
- `src/presentation/utils/importanceRanking.ts`
- `src/stores/termStore.ts`

---

## Step 6: バブル削除アルゴリズム
**ブランチ: `feature/bubble-lifecycle`**

### 仕様（旧 `app/App.tsx` から移植）

- `activeTerms` が 20件以下: 削除なし
- 21〜30件: 古い順に「削除待機」入り。5秒経過したら削除
- 31件以上: 最古のものを即時削除して 30件に収める
- 並び順の基準: `termTimestamps`（追加時刻）の昇順（古い = 先頭）

### 実装場所

```typescript
// src/stores/termStore.ts または
// src/presentation/hooks/useBubbleLifecycle.ts（フック化推奨）
```

`termTimestamps: Record<string, number>` を termStore に追加し、  
`addTerms` 時に `Date.now()` を記録する。

削除ループは `useBubbleLifecycle` フックで `setInterval(1000)` を回し、  
`removeTermById` を呼ぶ形にする（1秒ごとに判定）。

```typescript
// useBubbleLifecycle.ts（概要）
useEffect(() => {
  const id = setInterval(() => {
    const { activeTerms, termTimestamps, removeTermById } = useTermStore.getState()
    if (activeTerms.length <= 20) return

    const sorted = [...activeTerms].sort(
      (a, b) => (termTimestamps[a.id] ?? 0) - (termTimestamps[b.id] ?? 0)
    )

    // 30件超過分は即時削除
    if (sorted.length > 30) {
      sorted.splice(0, sorted.length - 30).forEach(t => removeTermById(t.id))
    }

    // 21〜30件の古い方にライフタイムを設定
    // deathRow は useRef で管理
    // 5秒経過したら removeTermById
  }, 1000)
  return () => clearInterval(id)
}, [])
```

`presentation/App.tsx` か `DuringPresentation` で1回だけマウントする。

### 変更ファイル

- `src/stores/termStore.ts`（`termTimestamps` / `removeTermById` は既存）
- `src/presentation/hooks/useBubbleLifecycle.ts`（新規）
- `src/presentation/App.tsx`（フック呼び出し追加）

---

## 未決事項・保留

- `SCORE_SCALE_FACTOR`（Step 5）の最終値はブラウザで動作確認しながら決定
- `FREQUENCY_DELTA` / `CLICK_DELTA` / `DEFAULT_SCORE_THRESHOLD` の初期値は仮値。実際の会話データで調整
- `useScoreUpdate` の `strategy` の DI 方法（現時点はシングルトン参照で可）
- ピン留め単語へのクリックでスコアを変化させないルールは Step 4 で実装済み前提

## 次のアクション

1. `feature/sse-foundation` ブランチで Step 1 を実装・確認（完了）
2. `feature/score-threshold-filter` ブランチで Step 2 を実装・確認（完了）
3. `feature/frequency-adapter` ブランチで Step 3 を実装・確認（完了）
4. `feature/click-score-service` ブランチで Step 4 を実装・確認（完了）
5. Step 5 完了後に `SCORE_SCALE_FACTOR` を調整
