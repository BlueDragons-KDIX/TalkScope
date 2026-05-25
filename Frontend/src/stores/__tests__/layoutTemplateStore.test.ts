import { beforeEach, describe, expect, it } from 'bun:test'
import type { LeafNode } from '../../domain/entities/Layout'
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
  })

  it('オリジナルレイアウトを追加して localStorage に保存できる', () => {
    const template = useLayoutTemplateStore.getState().addTemplate('自分用', sampleLayout)

    expect(useLayoutTemplateStore.getState().templates).toEqual([template])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([template])
  })

  it('オリジナルレイアウトを削除すると localStorage からも消える', () => {
    const template = useLayoutTemplateStore.getState().addTemplate('自分用', sampleLayout)

    useLayoutTemplateStore.getState().removeTemplate(template.id)

    expect(useLayoutTemplateStore.getState().templates).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([])
  })

  it('オリジナルレイアウトは最大数を超えて追加できない', () => {
    for (let i = 0; i < MAX_ORIGINAL_LAYOUT_TEMPLATES; i += 1) {
      useLayoutTemplateStore.getState().addTemplate(`layout-${i}`, sampleLayout)
    }

    expect(() => {
      useLayoutTemplateStore.getState().addTemplate('too-many', sampleLayout)
    }).toThrow(`最大${MAX_ORIGINAL_LAYOUT_TEMPLATES}個`)
  })
})
