import { describe, it, expect } from 'bun:test'
import { FrequencyStrategy } from '../FrequencyStrategy'
import type { Term } from '../../../domain/entities/Term'

const mockTerm: Term = {
  id: '1',
  word: 'React',
  kana: 'リアクト',
  shortDesc: 'UIライブラリ',
  longDesc: '詳細説明',
  category: 'Frontend',
  level: 1,
  relatedTerms: [],
}

describe('FrequencyStrategy', () => {
  const strategy = new FrequencyStrategy()

  it('頻度とクリック数が高いほどスコアが高い', () => {
    const low = strategy.calculate(mockTerm, { frequency: 1, clickWeight: 0 })
    const high = strategy.calculate(mockTerm, { frequency: 5, clickWeight: 3 })
    expect(high).toBeGreaterThan(low)
  })

  it('結果は0以上1以下に正規化される', () => {
    const score = strategy.calculate(mockTerm, { frequency: 100, clickWeight: 100 })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('頻度0・クリック0のとき最小スコアを返す', () => {
    const score = strategy.calculate(mockTerm, { frequency: 0, clickWeight: 0 })
    expect(score).toBe(0)
  })
})
