import { describe, it, expect, beforeEach } from 'bun:test'
import { useBubbleStore } from '../bubbleStore'
import { useTermStore } from '../termStore'
import { useTermMapWindowSettingsStore } from '../termMapWindowSettingsStore'

describe('bubbleStore', () => {
  beforeEach(() => {
    useTermMapWindowSettingsStore.setState({
      masterSizeScale: 1,
      bubbleSizeScale: 1,
      textFontSizePx: 12,
      autoSwitchEnabled: false,
      autoSwitchIntervalSec: 4,
      maxVisibleTerms: 5,
    })
    useTermStore.setState({
      activeTerms: [],
      termTimestamps: {},
      selectedTerm: null,
      searchHistory: [],
      pinnedTermIds: new Set(),
    })
    useBubbleStore.setState({
      visibleTermIds: [],
      bubbleTimestamps: {},
    })
  })

  it('表示枠に termId を追加できる', () => {
    expect(useBubbleStore.getState().addVisibleTermId('a')).toBe(true)
    expect(useBubbleStore.getState().visibleTermIds).toEqual(['a'])
    expect(typeof useBubbleStore.getState().bubbleTimestamps['a']).toBe('number')
  })

  it('上限到達時は最古の非スター語を表示枠から入れ替える', () => {
    const add = useBubbleStore.getState().addVisibleTermId
    add('a')
    add('b')
    add('c')
    add('d')
    add('e')
    expect(add('f')).toBe(true)
    expect(useBubbleStore.getState().visibleTermIds).toEqual(['b', 'c', 'd', 'e', 'f'])
  })

  it('表示枠がスターで埋まっている場合は新規を表示枠に追加しない', () => {
    const add = useBubbleStore.getState().addVisibleTermId
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      add(id)
      useTermStore.getState().togglePin(id)
    }
    expect(add('extra')).toBe(false)
    expect(useBubbleStore.getState().visibleTermIds).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('スター語は残して非スター語を優先的に表示枠から入れ替える', () => {
    const add = useBubbleStore.getState().addVisibleTermId
    add('a')
    add('b')
    add('c')
    add('d')
    add('e')
    useTermStore.getState().togglePin('a')
    expect(add('f')).toBe(true)
    expect(useBubbleStore.getState().visibleTermIds).toEqual(['a', 'c', 'd', 'e', 'f'])
  })

  it('removeVisibleTermId で表示枠とタイムスタンプを削除する', () => {
    useBubbleStore.getState().addVisibleTermId('a')
    useBubbleStore.getState().addVisibleTermId('b')
    useBubbleStore.getState().removeVisibleTermId('a')
    const s = useBubbleStore.getState()
    expect(s.visibleTermIds).toEqual(['b'])
    expect(s.bubbleTimestamps['a']).toBeUndefined()
  })

  it('clearVisible で表示枠を空にする', () => {
    useBubbleStore.getState().addVisibleTermId('a')
    useBubbleStore.getState().clearVisible()
    const s = useBubbleStore.getState()
    expect(s.visibleTermIds).toHaveLength(0)
    expect(Object.keys(s.bubbleTimestamps)).toHaveLength(0)
  })
})
