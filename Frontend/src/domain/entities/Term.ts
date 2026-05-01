export type TermCategory = 'Frontend' | 'Backend' | 'Infra' | 'AI/Data' | 'General'
/** 1: 初級, 2: 中級, 3: 上級 */
export type TermLevel = number

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
