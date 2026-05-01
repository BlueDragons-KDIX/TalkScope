import type { IImportanceStrategy, ImportanceContext } from '../../domain/interfaces/IImportanceStrategy'
import type { Term } from '../../domain/entities/Term'

export class FrequencyStrategy implements IImportanceStrategy {
  calculate(_term: Term, context: ImportanceContext): number {
    const { frequency, clickWeight } = context
    const raw = frequency * 0.7 + clickWeight * 0.3
    return Math.min(1, raw / 10)
  }
}
