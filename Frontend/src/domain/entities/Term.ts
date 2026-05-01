export type TermCategory = 'Frontend' | 'Backend' | 'Infra' | 'AI/Data' | 'General'
export type TermLevel = 1 | 2 | 3

export interface Term {
  id: string
  word: string
  kana: string
  shortDesc: string
  longDesc: string
  category: TermCategory
  level: TermLevel
  relatedTerms: string[]
  externalUrl?: string
}

export function isTerm(value: unknown): value is Term {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.word === 'string' &&
    typeof v.kana === 'string' &&
    typeof v.shortDesc === 'string' &&
    typeof v.longDesc === 'string' &&
    typeof v.category === 'string' &&
    typeof v.level === 'number' &&
    Array.isArray(v.relatedTerms)
  )
}
