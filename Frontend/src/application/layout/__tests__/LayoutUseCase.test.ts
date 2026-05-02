import { describe, it, expect, beforeEach } from 'bun:test'
import { LayoutUseCase } from '../LayoutUseCase'
import { useLayoutStore } from '../../../stores/layoutStore'
import type { LeafNode } from '../../../domain/entities/Layout'

const layout: LeafNode = { type: 'leaf', id: 'n1', windowId: 'transcription' }

describe('LayoutUseCase', () => {
  let useCase: LayoutUseCase

  beforeEach(() => {
    useLayoutStore.setState({ layouts: {} })
    useCase = new LayoutUseCase()
  })

  it('レイアウトを設定・取得できる', () => {
    useCase.setLayout('during', layout)
    expect(useCase.getLayout('during')).toEqual(layout)
  })

  it('設定されていないフェーズはnullを返す', () => {
    expect(useCase.getLayout('after')).toBeNull()
  })

  it('getCurrentLayoutはシリアライズされたJSONを返す', () => {
    useCase.setLayout('during', layout)
    const json = useCase.getCurrentLayoutJson('during')
    expect(JSON.parse(json)).toEqual(layout)
  })
})
