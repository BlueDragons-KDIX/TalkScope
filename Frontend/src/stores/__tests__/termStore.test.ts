import { describe, it, expect, beforeEach } from 'bun:test'
import { useTermStore } from '../termStore'
import type { Term } from '../../domain/entities/Term'

const term1: Term = {
  id: '1', word: 'React', kana: 'リアクト',
  shortDesc: 'UIライブラリ', longDesc: '詳細',
  category: 'Frontend', score: 1, relatedTerms: [],
}
const term2: Term = {
  id: '2', word: 'Docker', kana: 'ドッカー',
  shortDesc: 'コンテナ', longDesc: '詳細',
  category: 'Infra', score: 2, relatedTerms: [],
}

describe('termStore', () => {
  beforeEach(() => {
    useTermStore.setState({
      activeTerms: [],
      selectedTerm: null,
      searchHistory: [],
      pinnedTermIds: new Set(),
      termClickWeights: {},
    })
  })

  it('用語を追加できる', () => {
    useTermStore.getState().addTerms([term1])
    expect(useTermStore.getState().activeTerms).toHaveLength(1)
  })

  it('重複IDの用語は追加されない', () => {
    useTermStore.getState().addTerms([term1, term1])
    expect(useTermStore.getState().activeTerms).toHaveLength(1)
  })

  it('用語を選択できる', () => {
    useTermStore.getState().addTerms([term1])
    useTermStore.getState().selectTerm(term1)
    expect(useTermStore.getState().selectedTerm?.id).toBe('1')
  })

  it('ピン留めできる', () => {
    useTermStore.getState().togglePin('1')
    expect(useTermStore.getState().pinnedTermIds.has('1')).toBe(true)
  })

  it('ピン留め解除できる', () => {
    useTermStore.getState().togglePin('1')
    useTermStore.getState().togglePin('1')
    expect(useTermStore.getState().pinnedTermIds.has('1')).toBe(false)
  })

  it('クリック数を記録できる', () => {
    useTermStore.getState().incrementClickWeight('1')
    useTermStore.getState().incrementClickWeight('1')
    expect(useTermStore.getState().termClickWeights['1']).toBe(2)
  })

  it('検索履歴に追加できる', () => {
    useTermStore.getState().addToHistory(term1)
    useTermStore.getState().addToHistory(term2)
    expect(useTermStore.getState().searchHistory).toHaveLength(2)
  })

  it('履歴は重複を追加しない', () => {
    useTermStore.getState().addToHistory(term1)
    useTermStore.getState().addToHistory(term1)
    expect(useTermStore.getState().searchHistory).toHaveLength(1)
  })

  it('resetSession で用語・選択・履歴・ピン・重みを初期化できる', () => {
    useTermStore.getState().addTerms([term1])
    useTermStore.getState().selectTerm(term1)
    useTermStore.getState().addToHistory(term2)
    useTermStore.getState().togglePin('1')
    useTermStore.getState().incrementClickWeight('1')
    useTermStore.getState().resetSession()
    const s = useTermStore.getState()
    expect(s.activeTerms).toHaveLength(0)
    expect(s.selectedTerm).toBeNull()
    expect(s.searchHistory).toHaveLength(0)
    expect(s.pinnedTermIds.size).toBe(0)
    expect(Object.keys(s.termClickWeights)).toHaveLength(0)
  })

  it('addTerms は category を常に空文字に正規化する', () => {
    useTermStore.getState().addTerms([
      { ...term1, category: 'Frontend' },
      { ...term2, category: 'unknown' as Term['category'] },
    ])
    expect(useTermStore.getState().activeTerms[0]?.category).toBe('')
    expect(useTermStore.getState().activeTerms[1]?.category).toBe('')
  })

  it('stripDemoImportantTerms は demo-important- の用語だけ除去する', () => {
    const demoTerm: Term = {
      id: 'demo-important-react',
      word: 'React',
      kana: '',
      shortDesc: 'デモ',
      longDesc: 'デモ',
      category: 'Frontend',
      score: 1,
      relatedTerms: [],
    }
    useTermStore.getState().addTerms([term1, demoTerm])
    useTermStore.getState().stripDemoImportantTerms()
    expect(useTermStore.getState().activeTerms).toHaveLength(1)
    expect(useTermStore.getState().activeTerms[0]?.id).toBe('1')
  })
})
