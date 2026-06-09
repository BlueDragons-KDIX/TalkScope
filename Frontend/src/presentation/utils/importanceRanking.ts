import type { Term } from '../../domain/entities/Term'

export interface RankedTerm {
  term: Term
  score: number
}

const DEFAULT_ROW_HEIGHT = 46
const HEADER_HEIGHT = 44
const CONTAINER_PADDING = 12

export function rankTermsByImportance(
  terms: Term[],
): RankedTerm[] {
  return terms
    .map((term) => ({ term, score: term.score }))
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
