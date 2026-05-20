import type { Term } from '../../domain/entities/Term'

export interface RankingSignal {
  frequency: number
  clickWeight: number
}

export interface RankedTerm {
  term: Term
  score: number
  signal: RankingSignal
}

export type ScoreStrategy = (term: Term, signal: RankingSignal) => number

const DEFAULT_ROW_HEIGHT = 46
const HEADER_HEIGHT = 44
const CONTAINER_PADDING = 12

export const defaultScoreStrategy: ScoreStrategy = (_term, signal) => {
  return signal.frequency * 0.7 + signal.clickWeight * 0.3
}

export function rankTermsByImportance(
  terms: Term[],
  signals: Record<string, RankingSignal>,
  scoreStrategy: ScoreStrategy = defaultScoreStrategy,
): RankedTerm[] {
  return terms
    .map((term) => {
      const signal = signals[term.id] ?? { frequency: 0, clickWeight: 0 }
      return { term, score: scoreStrategy(term, signal), signal }
    })
    .sort((a, b) => b.score - a.score)
}

export function estimateVisibleRankingCount(
  containerHeight: number,
  rowHeight: number = DEFAULT_ROW_HEIGHT,
): number {
  const usable = containerHeight - HEADER_HEIGHT - CONTAINER_PADDING
  if (usable <= 0) return 1
  return Math.max(1, Math.floor(usable / rowHeight))
}
