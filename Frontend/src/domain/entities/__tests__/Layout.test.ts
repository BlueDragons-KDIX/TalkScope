import { describe, it, expect } from 'bun:test'
import { isLeafNode, isSplitNode } from '../Layout'
import type { LeafNode, SplitNode } from '../Layout'

const leaf: LeafNode = {
  type: 'leaf',
  id: 'n1',
  windowId: 'transcription',
}

const split: SplitNode = {
  type: 'split',
  id: 'n2',
  direction: 'h',
  ratio: 0.5,
  a: leaf,
  b: { type: 'leaf', id: 'n3', windowId: 'bubbleCloud' },
}

describe('isLeafNode', () => {
  it('LeafNodeを正しく識別する', () => {
    expect(isLeafNode(leaf)).toBe(true)
  })

  it('SplitNodeをLeafNodeとして識別しない', () => {
    expect(isLeafNode(split)).toBe(false)
  })
})

describe('isSplitNode', () => {
  it('SplitNodeを正しく識別する', () => {
    expect(isSplitNode(split)).toBe(true)
  })

  it('LeafNodeをSplitNodeとして識別しない', () => {
    expect(isSplitNode(leaf)).toBe(false)
  })
})
