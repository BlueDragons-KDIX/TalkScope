import { describe, it, expect, beforeEach } from 'bun:test'
import { useTermStore } from '../termStore'
import type { Term } from '../../domain/entities/Term'
import { useTermMapWindowSettingsStore } from '../termMapWindowSettingsStore'

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
const makeTerm = (id: string): Term => ({
  id,
  word: `word-${id}`,
  kana: `かな-${id}`,
  shortDesc: 'desc',
  longDesc: 'long',
  category: 'General',
  score: 1,
  relatedTerms: [],
})

describe('termStore', () => {
  beforeEach(() => {
    useTermMapWindowSettingsStore.setState({
      masterSizeScale: 1,
      bubbleSizeScale: 1,
      textFontSizePx: 12,
      autoSwitchEnabled: false,
      autoSwitchIntervalSec: 4,
      maxVisibleTerms: 30,
    })
    useTermStore.setState({
      activeTerms: [],
      termTimestamps: {},
      selectedTerm: null,
      searchHistory: [],
      pinnedTermIds: new Set(),
    })
  })

  it('用語を追加できる', () => {
    useTermStore.getState().addTerms([term1])
    const state = useTermStore.getState()
    expect(state.activeTerms).toHaveLength(1)
    expect(typeof state.termTimestamps['1']).toBe('number')
  })

  it('重複IDの用語は追加されない', () => {
    useTermStore.getState().addTerms([term1, term1])
    const state = useTermStore.getState()
    expect(state.activeTerms).toHaveLength(1)
    expect(Object.keys(state.termTimestamps)).toHaveLength(1)
  })

  it('maxVisibleTerms 上限到達時は最古の非スター語を入れ替える', () => {
    useTermMapWindowSettingsStore.getState().setMaxVisibleTerms(5)
    useTermStore.getState().addTerms([
      makeTerm('a'),
      makeTerm('b'),
      makeTerm('c'),
      makeTerm('d'),
      makeTerm('e'),
    ])
    useTermStore.getState().addTerms([makeTerm('f')])
    expect(useTermStore.getState().activeTerms.map((term) => term.id)).toEqual(['b', 'c', 'd', 'e', 'f'])
  })

  it('表示枠がスターで埋まっている場合は新規追加しない', () => {
    useTermMapWindowSettingsStore.getState().setMaxVisibleTerms(5)
    useTermStore.getState().addTerms([
      makeTerm('p1'),
      makeTerm('p2'),
      makeTerm('p3'),
      makeTerm('p4'),
      makeTerm('p5'),
    ])
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      useTermStore.getState().togglePin(id)
    }
    useTermStore.getState().addTerms([makeTerm('extra')])
    expect(useTermStore.getState().activeTerms.map((term) => term.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('スター語は残して非スター語を優先的に置き換える', () => {
    useTermMapWindowSettingsStore.getState().setMaxVisibleTerms(5)
    useTermStore.getState().addTerms([
      makeTerm('a'),
      makeTerm('b'),
      makeTerm('c'),
      makeTerm('d'),
      makeTerm('e'),
    ])
    useTermStore.getState().togglePin('a')
    useTermStore.getState().addTerms([makeTerm('f')])
    expect(useTermStore.getState().activeTerms.map((term) => term.id)).toEqual(['a', 'c', 'd', 'e', 'f'])
  })

  it('updateTermScore で対象のスコアを更新できる', () => {
    useTermStore.getState().addTerms([term1, term2])
    useTermStore.getState().updateTermScore('1', 9.5)
    const terms = useTermStore.getState().activeTerms
    expect(terms.find((t) => t.id === '1')?.score).toBe(9.5)
    expect(terms.find((t) => t.id === '2')?.score).toBe(2)
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

  it('resetSession で用語・選択・履歴・ピンを初期化できる', () => {
    useTermStore.getState().addTerms([term1])
    useTermStore.getState().selectTerm(term1)
    useTermStore.getState().addToHistory(term2)
    useTermStore.getState().togglePin('1')
    useTermStore.getState().resetSession()
    const s = useTermStore.getState()
    expect(s.activeTerms).toHaveLength(0)
    expect(s.selectedTerm).toBeNull()
    expect(s.searchHistory).toHaveLength(0)
    expect(s.pinnedTermIds.size).toBe(0)
    expect(Object.keys(s.termTimestamps)).toHaveLength(0)
  })

  it('removeTermById でタイムスタンプも削除される', () => {
    useTermStore.getState().addTerms([term1, term2])
    useTermStore.getState().removeTermById('1')
    const s = useTermStore.getState()
    expect(s.activeTerms.map((term) => term.id)).toEqual(['2'])
    expect(s.termTimestamps['1']).toBeUndefined()
    expect(typeof s.termTimestamps['2']).toBe('number')
  })

  it('clearActiveTerms で用語とタイムスタンプをまとめてクリアする', () => {
    useTermStore.getState().addTerms([term1, term2])
    useTermStore.getState().clearActiveTerms()
    const s = useTermStore.getState()
    expect(s.activeTerms).toHaveLength(0)
    expect(Object.keys(s.termTimestamps)).toHaveLength(0)
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
    const s = useTermStore.getState()
    expect(s.activeTerms).toHaveLength(1)
    expect(s.activeTerms[0]?.id).toBe('1')
    expect(s.termTimestamps['demo-important-react']).toBeUndefined()
  })
})
