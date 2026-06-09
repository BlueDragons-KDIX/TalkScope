import { describe, expect, it } from 'bun:test'
import {
  estimateVisibleRankingCount,
  rankTermsByImportance,
} from '../importanceRanking'
import type { Term } from '../../../domain/entities/Term'

const makeTerm = (id: string, score: number): Term => ({
  id,
  word: `word-${id}`,
  kana: `かな-${id}`,
  shortDesc: 'desc',
  longDesc: 'long',
  category: 'General',
  score,
  relatedTerms: [],
})

describe('importanceRanking utilities', () => {
  it('重要度スコア降順でソートする', () => {
    const terms = [makeTerm('a', 1), makeTerm('b', 2), makeTerm('c', 3)]
    const ranked = rankTermsByImportance(terms)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score)
  })

  it('各行の score は term.score をそのまま使う', () => {
    const terms = [makeTerm('x', 1)]
    const ranked = rankTermsByImportance(terms)
    expect(ranked[0].score).toBe(1)
  })

  it('ウィンドウ高さから表示可能件数を算出する', () => {
    expect(estimateVisibleRankingCount(300)).toBeGreaterThan(1)
    expect(estimateVisibleRankingCount(20)).toBe(1)
  })
})
