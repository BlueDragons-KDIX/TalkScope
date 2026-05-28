import type { Term } from '../../domain/entities/Term'
import type { IScoreUpdateStrategy } from '../../domain/interfaces'
import { useTermStore } from '../../stores/termStore'

interface TermScoreUpdate {
  id: string
  score: number
}

export class FrequencyScoreAdapter {
  private counts = new Map<string, number>()

  constructor(private strategy: IScoreUpdateStrategy) {}

  adapt(terms: Term[]): { toAdd: Term[]; toUpdate: TermScoreUpdate[] } {
    const toAdd: Term[] = []
    const toUpdate: TermScoreUpdate[] = []

    for (const term of terms) {
      const prev = this.counts.get(term.id) ?? 0
      const next = prev + 1
      this.counts.set(term.id, next)

      if (prev === 0) {
        toAdd.push(term)
      } else {
        const currentScore = useTermStore.getState().activeTerms
          .find((activeTerm) => activeTerm.id === term.id)?.score ?? term.score
        const newScore = this.strategy.onFrequency(currentScore, next)
        toUpdate.push({ id: term.id, score: newScore })
      }
    }

    return { toAdd, toUpdate }
  }

  reset(): void {
    this.counts.clear()
  }
}
