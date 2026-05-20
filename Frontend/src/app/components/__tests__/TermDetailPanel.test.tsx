/// <reference lib="dom" />
import React from 'react'
import { describe, it, expect, beforeEach } from 'bun:test'
import { render } from '@testing-library/react'
import { TermDetailPanel } from '../TermDetailPanel'
import type { Term } from '../../data/terms'
import { useContentFontScaleStore } from '../../../stores/contentFontScaleStore'

const noop = () => {}

const sampleTerm: Term = {
  id: 'test-term-1',
  word: 'RAG',
  kana: 'ラグ',
  shortDesc: '検索拡張生成',
  longDesc: '検索と生成を組み合わせるアプローチの説明文です。',
  category: 'AI/Data',
  score: 2,
  relatedTerms: ['ベクトル'],
}

describe('TermDetailPanel (PR #28: Hooks 順序)', () => {
  beforeEach(() => {
    useContentFontScaleStore.setState({ scale: 1 })
  })

  it('term が null のときプレースホルダーを表示する', () => {
    const view = render(
      <TermDetailPanel
        term={null}
        onClose={noop}
        onRelatedTermClick={noop}
        darkMode
      />,
    )
    expect(view.getByText(/用語をクリックすると/)).toBeTruthy()
  })

  it('term があるとき見出しに単語を表示する', () => {
    const view = render(
      <TermDetailPanel
        term={sampleTerm}
        onClose={noop}
        onRelatedTermClick={noop}
        darkMode
      />,
    )
    expect(view.getByText('RAG')).toBeTruthy()
    expect(view.getByText(/検索と生成を組み合わせる/)).toBeTruthy()
    expect(view.queryByText('AI/Data')).toBeNull()
  })

  it('同一ルートで null → term に切り替えてもフック順エラーにならない', () => {
    const { rerender, getByText } = render(
      <TermDetailPanel term={null} onClose={noop} onRelatedTermClick={noop} darkMode />,
    )
    expect(getByText(/用語をクリックすると/)).toBeTruthy()

    rerender(<TermDetailPanel term={sampleTerm} onClose={noop} onRelatedTermClick={noop} darkMode />)
    expect(getByText('RAG')).toBeTruthy()

    rerender(<TermDetailPanel term={null} onClose={noop} onRelatedTermClick={noop} darkMode />)
    expect(getByText(/用語をクリックすると/)).toBeTruthy()
  })
})
