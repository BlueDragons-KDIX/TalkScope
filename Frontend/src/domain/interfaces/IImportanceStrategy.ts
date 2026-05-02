import type { Term } from '../entities/Term'

export interface ImportanceContext {
  frequency: number
  clickWeight: number
  themeVector?: number[]
  termVector?: number[]
}

export interface IImportanceStrategy {
  calculate(term: Term, context: ImportanceContext): number
}
