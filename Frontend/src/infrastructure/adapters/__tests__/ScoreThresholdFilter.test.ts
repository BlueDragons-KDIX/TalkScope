import { describe, expect, it } from 'bun:test'
import type { Term } from '../../../domain/entities/Term'
import { filterByScore, partitionByScore } from '../ScoreThresholdFilter'

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

describe('ScoreThresholdFilter', () => {
  it('デフォルト閾値(0.1)以上の用語のみ返す', () => {
    const result = filterByScore([
      makeTerm('a', 0.05),
      makeTerm('b', 0.1),
      makeTerm('c', 0.2),
    ])
    expect(result.map((term) => term.id)).toEqual(['b', 'c'])
  })

  it('閾値を引数で上書きできる', () => {
    const result = filterByScore([
      makeTerm('a', 0.2),
      makeTerm('b', 0.6),
      makeTerm('c', 0.8),
    ], 0.7)
    expect(result.map((term) => term.id)).toEqual(['c'])
  })

  it('閾値比較を通過/除外で分割できる', () => {
    const { passed, rejected } = partitionByScore([
      makeTerm('a', 0.5),
      makeTerm('b', 0.49),
      makeTerm('c', 0.7),
    ], 0.5)
    expect(passed.map((term) => term.id)).toEqual(['a', 'c'])
    expect(rejected.map((term) => term.id)).toEqual(['b'])
  })
})
