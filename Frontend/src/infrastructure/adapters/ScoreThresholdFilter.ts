import type { Term } from '../../domain/entities/Term'

export const DEFAULT_SCORE_THRESHOLD = 0.1

export function filterByScore(
  terms: Term[],
  threshold: number = DEFAULT_SCORE_THRESHOLD,
): Term[] {
  return terms.filter((term) => term.score >= threshold)
}
