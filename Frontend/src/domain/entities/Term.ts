/** @deprecated 互換のため型のみ残す */
export type TermCategory = string

/** @deprecated 互換のため型のみ残す（初級/中級/上級ランクは廃止） */
export type TermScore = number

/** 廃止フィールド category 用。null / undefined / 任意の値はいずれも空文字にする */
export function normalizeTermCategory(_value: unknown): string {
  return ''
}

export interface Term {
  id: string
  word: string
  kana: string // 無くす予定
  shortDesc: string // 無くす予定
  longDesc: string // 長い説明のみ残す
  /** 不要になったカテゴリは空文字に正規化して保持 */
  category: string
  /** @deprecated 互換のためフィールドを残す（ランク表示・算出は廃止） */
  score: TermScore
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
