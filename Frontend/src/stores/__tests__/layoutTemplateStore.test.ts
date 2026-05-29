import { beforeEach, describe, expect, it } from 'bun:test'
import type { LeafNode } from '../../domain/entities/Layout'
import { capturePresentationSnapshot } from '../../presentation/layout/presentationSnapshot'
import { useTermMapWindowSettingsStore } from '../termMapWindowSettingsStore'
import {
  MAX_ORIGINAL_LAYOUT_TEMPLATES,
  useLayoutTemplateStore,
} from '../layoutTemplateStore'

const STORAGE_KEY = 'talkscope:original-layout-templates'

const sampleLayout: LeafNode = {
  type: 'leaf',
  id: 'n1',
  windowId: 'transcription',
}

describe('layoutTemplateStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useLayoutTemplateStore.setState({ templates: [] })
    useTermMapWindowSettingsStore.setState({
      ...useTermMapWindowSettingsStore.getState(),
      maxVisibleTerms: 30,
    })
  })

  it('オリジナルレイアウトを snapshot 付きで localStorage に保存できる', () => {
    const snapshot = capturePresentationSnapshot('during', sampleLayout)
    snapshot.appearance.themeColor = 'rose'
    const template = useLayoutTemplateStore.getState().addTemplate('自分用', snapshot)

    expect(template.snapshot?.appearance.themeColor).toBe('rose')
    expect(template.layout).toEqual(sampleLayout)
    expect(useLayoutTemplateStore.getState().templates).toEqual([template])
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as typeof template[]
    expect(stored[0]?.snapshot?.appearance.themeColor).toBe('rose')
  })

  it('オリジナルレイアウトを削除すると localStorage からも消える', () => {
    const template = useLayoutTemplateStore.getState().addTemplate(
      '自分用',
      capturePresentationSnapshot('during', sampleLayout),
    )

    useLayoutTemplateStore.getState().removeTemplate(template.id)

    expect(useLayoutTemplateStore.getState().templates).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([])
  })

  it('オリジナルレイアウトは最大数を超えて追加できない', () => {
    for (let i = 0; i < MAX_ORIGINAL_LAYOUT_TEMPLATES; i += 1) {
      useLayoutTemplateStore.getState().addTemplate(
        `layout-${i}`,
        capturePresentationSnapshot('during', sampleLayout),
      )
    }

    expect(() => {
      useLayoutTemplateStore.getState().addTemplate(
        'too-many',
        capturePresentationSnapshot('during', sampleLayout),
      )
    }).toThrow(`最大${MAX_ORIGINAL_LAYOUT_TEMPLATES}個`)
  })

  it('localStorage の旧形式（layout のみ）は読み込み時に snapshot が undefined', () => {
    const legacy = [{
      id: 'legacy-1',
      name: '旧形式',
      layout: sampleLayout,
    }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))

    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Array<{
      layout: LeafNode
      snapshot?: unknown
    }>
    expect(parsed[0]?.layout).toEqual(sampleLayout)
    expect(parsed[0]?.snapshot).toBeUndefined()
  })
})
