import type { IImportanceStrategy, ImportanceContext } from '../../domain/interfaces/IImportanceStrategy'
import type { Term } from '../../domain/entities/Term'

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  if (len === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0
  return Math.max(-1, Math.min(1, dot / denom))
}

export class VectorSimilarityStrategy implements IImportanceStrategy {
  calculate(_term: Term, context: ImportanceContext): number {
    const { frequency, clickWeight, themeVector, termVector } = context

    const freqScore = Math.min(1, (frequency * 0.7 + clickWeight * 0.3) / 10)

    if (!themeVector || !termVector) return freqScore

    const sim = cosineSimilarity(themeVector, termVector)
    const simScore = (sim + 1) / 2

    return Math.min(1, freqScore * 0.5 + simScore * 0.5)
  }
}
