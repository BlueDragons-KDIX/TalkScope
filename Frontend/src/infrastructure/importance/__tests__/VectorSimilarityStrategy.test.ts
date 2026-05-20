import { describe, it, expect } from 'bun:test'
import { VectorSimilarityStrategy } from '../VectorSimilarityStrategy'
import type { Term } from '../../../domain/entities/Term'

const mockTerm: Term = {
  id: '1',
  word: 'React',
  kana: 'リアクト',
  shortDesc: 'UIライブラリ',
  longDesc: '詳細説明',
  category: 'Frontend',
  score: 1,
  relatedTerms: [],
}

const themeVector = [1, 0, 0]
const similarTermVector = [0.9, 0.1, 0]
const dissimilarTermVector = [0, 0, 1]

describe('VectorSimilarityStrategy', () => {
  const strategy = new VectorSimilarityStrategy()

  it('テーマに近いベクトルのスコアが高い', () => {
    const high = strategy.calculate(mockTerm, {
      frequency: 2, clickWeight: 1,
      themeVector, termVector: similarTermVector,
    })
    const low = strategy.calculate(mockTerm, {
      frequency: 2, clickWeight: 1,
      themeVector, termVector: dissimilarTermVector,
    })
    expect(high).toBeGreaterThan(low)
  })

  it('ベクトルがない場合は頻度のみで計算する', () => {
    const score = strategy.calculate(mockTerm, { frequency: 3, clickWeight: 1 })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('結果は0以上1以下に正規化される', () => {
    const score = strategy.calculate(mockTerm, {
      frequency: 100, clickWeight: 100,
      themeVector, termVector: similarTermVector,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})
