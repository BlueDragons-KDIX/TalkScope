import { describe, expect, it } from 'bun:test'
import { mapToTerm, mapToTerms } from '../TermMapper'

const emptyLegacy = {
  id: '',
  kana: '',
  category: '',
  relatedTerms: [] as string[],
}

describe('TermMapper', () => {
  it('maps one SSE row to Term with empty id', () => {
    expect(
      mapToTerm({
        term: '  量子計算  ',
        description: ' 量子ビットを用いる計算方式 ',
        score: 0.42,
        source: 'db',
      }),
    ).toEqual({
      ...emptyLegacy,
      word: '量子計算',
      shortDesc: '量子ビットを用いる計算方式',
      longDesc: '量子ビットを用いる計算方式',
      score: 0.42,
    })
  })

  it('maps empty description when missing', () => {
    expect(
      mapToTerm({
        term: 'API',
        description: '',
        score: 1,
        source: 'llm',
      }),
    ).toEqual({
      ...emptyLegacy,
      word: 'API',
      shortDesc: '',
      longDesc: '',
      score: 1,
    })
  })

  it('maps SSE data array preserving order', () => {
    expect(
      mapToTerms([
        {
          term: 'a',
          description: '説明A',
          score: 0.1,
          source: 'db',
        },
        {
          term: 'b',
          description: '説明B',
          score: 0.2,
          source: 'llm',
        },
      ]),
    ).toEqual([
      {
        ...emptyLegacy,
        word: 'a',
        shortDesc: '説明A',
        longDesc: '説明A',
        score: 0.1,
      },
      {
        ...emptyLegacy,
        word: 'b',
        shortDesc: '説明B',
        longDesc: '説明B',
        score: 0.2,
      },
    ])
  })
})
