import type { Term } from '../../domain/entities/Term'

export const DEFAULT_SCORE_THRESHOLD = 0.42

export interface ScoreThresholdPartition {
  passed: Term[]
  rejected: Term[]
}

export function filterByScore(
  terms: Term[],
  threshold: number = DEFAULT_SCORE_THRESHOLD,
): Term[] {
  return terms.filter((term) => term.score >= threshold)
}

export function partitionByScore(
  terms: Term[],
  threshold: number = DEFAULT_SCORE_THRESHOLD,
): ScoreThresholdPartition {
  const passed: Term[] = []
  const rejected: Term[] = []
  for (const term of terms) {
    if (term.score >= threshold) passed.push(term)
    else rejected.push(term)
  }
  return { passed, rejected }
}
