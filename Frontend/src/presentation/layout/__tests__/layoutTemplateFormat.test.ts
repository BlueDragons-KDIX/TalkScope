import { describe, expect, it } from 'bun:test'
import type { LayoutNode } from '../../../domain/entities/Layout'
import { formatLayoutTemplateMethod, parseLayoutTemplateText } from '../layoutTemplateFormat'

const sampleLayout: LayoutNode = {
  type: 'split',
  id: 'n1',
  direction: 'h',
  ratio: 0.35,
  a: { type: 'leaf', id: 'n2', windowId: 'transcription' },
  b: { type: 'leaf', id: 'n3', windowId: 'bubbleCloud' },
}

describe('layoutTemplateFormat', () => {
  it('JSON のレイアウト情報を LayoutNode として読み込める', () => {
    expect(parseLayoutTemplateText(JSON.stringify(sampleLayout, null, 2))).toEqual(sampleLayout)
  })

  it('コピー用メソッド形式のレイアウト情報を読み込める', () => {
    const text = formatLayoutTemplateMethod('during', sampleLayout)
    expect(parseLayoutTemplateText(text)).toEqual(sampleLayout)
  })

  it('LayoutNode ではない内容は拒否する', () => {
    expect(() => parseLayoutTemplateText('{"type":"leaf","id":"n1"}')).toThrow()
  })
})
