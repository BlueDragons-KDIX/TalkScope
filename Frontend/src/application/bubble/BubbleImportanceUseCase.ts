import type { IImportanceStrategy, ImportanceContext } from '../../domain/interfaces/IImportanceStrategy'
import type { Term } from '../../domain/entities/Term'
import type { Bubble } from '../../domain/entities/Bubble'

export class BubbleImportanceUseCase {
  constructor(private strategy: IImportanceStrategy) {}

  setStrategy(strategy: IImportanceStrategy): void {
    this.strategy = strategy
  }

  createBubble(term: Term, context: ImportanceContext): Bubble {
    return {
      term,
      importance: this.strategy.calculate(term, context),
    }
  }

  createBubbles(
    terms: Term[],
    contexts: Record<string, ImportanceContext>,
  ): Bubble[] {
    return terms.map(term =>
      this.createBubble(term, contexts[term.id] ?? { frequency: 0, clickWeight: 0 })
    )
  }

  sortByImportance(bubbles: Bubble[]): Bubble[] {
    return [...bubbles].sort((a, b) => b.importance - a.importance)
  }
}
