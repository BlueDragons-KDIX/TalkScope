import { beforeEach, describe, expect, it } from 'bun:test'
import type { Term } from '../../domain/entities/Term'
import { usePipelineDebugStore } from '../pipelineDebugStore'

const term: Term = {
  id: 't1',
  word: 'React',
  kana: '',
  shortDesc: '',
  longDesc: '',
  category: '',
  score: 0.8,
  relatedTerms: [],
}

describe('pipelineDebugStore', () => {
  beforeEach(() => {
    usePipelineDebugStore.getState().clearAll()
  })

  it('送信テキストを記録できる', () => {
    usePipelineDebugStore.getState().pushSentInput('テスト送信')
    expect(usePipelineDebugStore.getState().sentInputs).toEqual(['テスト送信'])
  })

  it('SSE行データを記録できる', () => {
    usePipelineDebugStore.getState().pushSseRows([
      { id: '1', term: 'TypeScript', description: 'desc', score: 0.7, source: 'db' },
    ])
    expect(usePipelineDebugStore.getState().sseTerms[0]?.term).toBe('TypeScript')
  })

  it('レイヤー表示フラグを切り替えられる', () => {
    usePipelineDebugStore.getState().toggleLayer('sse')
    expect(usePipelineDebugStore.getState().visibleLayers.sse).toBe(false)
  })

  it('フィルタ閾値だけを更新できる', () => {
    usePipelineDebugStore.getState().setFilteredThreshold(0.55)
    expect(usePipelineDebugStore.getState().filteredThreshold).toBe(0.55)
  })

  it('フィルタ結果とバブル表示語を更新できる', () => {
    usePipelineDebugStore.getState().setFilteredThreshold(0.35)
    usePipelineDebugStore.getState().setFilteredTerms(0.4, [term], [])
    usePipelineDebugStore.getState().setBubbleTerms([term])
    const state = usePipelineDebugStore.getState()
    expect(state.filteredThreshold).toBe(0.4)
    expect(state.filteredPassedTerms[0]?.word).toBe('React')
    expect(state.filteredRejectedTerms).toHaveLength(0)
    expect(state.bubbleTerms[0]?.word).toBe('React')
  })
})
