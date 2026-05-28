import { beforeEach, describe, expect, it } from 'bun:test'
import type { Term } from '../../../domain/entities/Term'
import type { IScoreUpdateStrategy } from '../../../domain/interfaces'
import { useTermStore } from '../../../stores/termStore'
import { FrequencyScoreAdapter } from '../FrequencyScoreAdapter'

const makeTerm = (id: string, score: number): Term => ({
  id,
  word: `word-${id}`,
  kana: '',
  shortDesc: '',
  longDesc: '',
  category: '',
  score,
  relatedTerms: [],
})

const strategy: IScoreUpdateStrategy = {
  onFrequency: (currentScore, count) => currentScore + count * 0.1,
  onClick: (currentScore) => currentScore + 0.1,
}

describe('FrequencyScoreAdapter', () => {
  beforeEach(() => {
    useTermStore.setState({
      activeTerms: [],
      selectedTerm: null,
      searchHistory: [],
      pinnedTermIds: new Set(),
    })
  })

  it('初出の用語は toAdd に入る', () => {
    const adapter = new FrequencyScoreAdapter(strategy)
    const result = adapter.adapt([makeTerm('a', 0.5)])
    expect(result.toAdd.map((term) => term.id)).toEqual(['a'])
    expect(result.toUpdate).toEqual([])
  })

  it('2回目以降は strategy で加算して toUpdate を返す', () => {
    const adapter = new FrequencyScoreAdapter(strategy)
    useTermStore.getState().addTerms([makeTerm('a', 1.0)])
    adapter.adapt([makeTerm('a', 1.0)])
    const second = adapter.adapt([makeTerm('a', 1.0)])
    expect(second.toAdd).toEqual([])
    expect(second.toUpdate).toEqual([{ id: 'a', score: 1.2 }])
  })

  it('reset 後は同じ用語を再び初出扱いにする', () => {
    const adapter = new FrequencyScoreAdapter(strategy)
    adapter.adapt([makeTerm('a', 0.5)])
    adapter.reset()
    const result = adapter.adapt([makeTerm('a', 0.6)])
    expect(result.toAdd.map((term) => term.id)).toEqual(['a'])
  })
})
