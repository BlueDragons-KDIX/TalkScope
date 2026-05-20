import { describe, it, expect } from 'bun:test'
import { isTerm } from '../Term'
import type { Term } from '../Term'

const validTerm: Term = {
  id: '1',
  word: 'React',
  kana: 'リアクト',
  shortDesc: 'UIライブラリ',
  longDesc: '詳細説明',
  category: 'Frontend',
  score: 1,
  relatedTerms: ['Next.js'],
}

describe('isTerm', () => {
  it('正常なTermオブジェクトを受け入れる', () => {
    expect(isTerm(validTerm)).toBe(true)
  })

  it('externalUrlなしでも有効', () => {
    expect(isTerm(validTerm)).toBe(true)
  })

  it('nullを拒否する', () => {
    expect(isTerm(null)).toBe(false)
  })

  it('プリミティブ値を拒否する', () => {
    expect(isTerm('string')).toBe(false)
    expect(isTerm(42)).toBe(false)
  })

  it('必須フィールドが欠けているオブジェクトを拒否する', () => {
    expect(isTerm({ id: '1', word: 'React' })).toBe(false)
  })

  it('relatedTermsが配列でない場合を拒否する', () => {
    expect(isTerm({ ...validTerm, relatedTerms: 'not-array' })).toBe(false)
  })
})
