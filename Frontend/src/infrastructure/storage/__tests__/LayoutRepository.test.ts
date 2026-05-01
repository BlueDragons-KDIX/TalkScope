import { describe, it, expect, beforeEach } from 'bun:test'
import { LayoutRepository } from '../LayoutRepository'
import type { LeafNode } from '../../../domain/entities/Layout'

const sampleLayout: LeafNode = {
  type: 'leaf',
  id: 'n1',
  windowId: 'transcription',
}

describe('LayoutRepository', () => {
  let repo: LayoutRepository

  beforeEach(() => {
    const store: Record<string, string> = {}
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
    }
    repo = new LayoutRepository(mockStorage as unknown as Storage)
  })

  it('保存したレイアウトを読み込める', () => {
    repo.save('during', sampleLayout)
    const loaded = repo.load('during')
    expect(loaded).toEqual(sampleLayout)
  })

  it('保存していないフェーズはnullを返す', () => {
    expect(repo.load('after')).toBeNull()
  })

  it('上書き保存できる', () => {
    repo.save('during', sampleLayout)
    const newLayout: LeafNode = { type: 'leaf', id: 'n2', windowId: 'bubbleCloud' }
    repo.save('during', newLayout)
    expect(repo.load('during')).toEqual(newLayout)
  })

  it('現在のレイアウトをシリアライズして返せる', () => {
    repo.save('during', sampleLayout)
    const serialized = repo.serialize('during')
    expect(typeof serialized).toBe('string')
    expect(JSON.parse(serialized)).toEqual(sampleLayout)
  })
})
