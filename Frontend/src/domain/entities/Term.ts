export type TermCategory = 'Frontend' | 'Backend' | 'Infra' | 'AI/Data' | 'General'
/** 1: 初級, 2: 中級, 3: 上級 */
export type TermScore = number

export interface Term {
  id: string
  word: string
  kana: string // 無くす予定
  shortDesc: string // 無くす予定
  longDesc: string // 長い説明のみ残す
  category: TermCategory
  score: TermScore // スコアに変更(計算アルゴリズムはサーバー側で行う、出現頻度とクリック回数はフロントで維持)
  relatedTerms: string[] // 無くす予定
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
    typeof v.score === 'number' &&
    Array.isArray(v.relatedTerms)
  )
}
