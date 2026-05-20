import { describe, it, expect } from 'bun:test'
import { BubbleImportanceUseCase } from '../BubbleImportanceUseCase'
import { FrequencyStrategy } from '../../../infrastructure/importance/FrequencyStrategy'
import type { Term } from '../../../domain/entities/Term'

const makeTerm = (id: string): Term => ({
  id, word: `Term${id}`, kana: 'かな', shortDesc: '説明',
  longDesc: '詳細', category: 'General', score: 1, relatedTerms: [],
})

describe('BubbleImportanceUseCase', () => {
  const useCase = new BubbleImportanceUseCase(new FrequencyStrategy())

  it('Termからバブルを生成できる', () => {
    const bubble = useCase.createBubble(makeTerm('1'), { frequency: 3, clickWeight: 1 })
    expect(bubble.term.id).toBe('1')
    expect(bubble.importance).toBeGreaterThan(0)
  })

  it('複数のTermからバブルリストを生成できる', () => {
    const terms = [makeTerm('1'), makeTerm('2'), makeTerm('3')]
    const contexts = { '1': { frequency: 3, clickWeight: 0 }, '2': { frequency: 1, clickWeight: 2 }, '3': { frequency: 0, clickWeight: 0 } }
    const bubbles = useCase.createBubbles(terms, contexts)
    expect(bubbles).toHaveLength(3)
  })

  it('重要度に基づいてソートできる', () => {
    const terms = [makeTerm('a'), makeTerm('b')]
    const contexts = { 'a': { frequency: 1, clickWeight: 0 }, 'b': { frequency: 5, clickWeight: 0 } }
    const bubbles = useCase.createBubbles(terms, contexts)
    const sorted = useCase.sortByImportance(bubbles)
    expect(sorted[0].importance).toBeGreaterThanOrEqual(sorted[1].importance)
  })

  it('ストラテジーを差し替えられる', () => {
    const useCase2 = new BubbleImportanceUseCase(new FrequencyStrategy())
    const bubble = useCase2.createBubble(makeTerm('x'), { frequency: 5, clickWeight: 5 })
    expect(bubble.importance).toBeGreaterThan(0)
  })
})
