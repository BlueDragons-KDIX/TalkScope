import { describe, expect, it } from 'bun:test'
import {
  estimateVisibleRankingCount,
  rankTermsByImportance,
  type RankingSignal,
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
    const signals: Record<string, RankingSignal> = {
      a: { frequency: 1, clickWeight: 0 },
      b: { frequency: 2, clickWeight: 1 },
      c: { frequency: 0, clickWeight: 4 },
    }

    const ranked = rankTermsByImportance(terms, signals)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score)
  })

  it('シグナル未定義の用語は 0 基準で評価する', () => {
    const terms = [makeTerm('x', 1)]
    const ranked = rankTermsByImportance(terms, {})
    expect(ranked[0].signal.frequency).toBe(0)
    expect(ranked[0].signal.clickWeight).toBe(0)
  })

  it('ウィンドウ高さから表示可能件数を算出する', () => {
    expect(estimateVisibleRankingCount(300)).toBeGreaterThan(1)
    expect(estimateVisibleRankingCount(20)).toBe(1)
  })
})
