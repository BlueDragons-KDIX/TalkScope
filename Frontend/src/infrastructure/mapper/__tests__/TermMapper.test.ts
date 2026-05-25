import { describe, expect, it } from 'bun:test'
import { mapToTerm, mapToTerms } from '../TermMapper'

const emptyLegacy = {
  kana: '',
  category: '',
  relatedTerms: [] as string[],
}

describe('TermMapper', () => {
  it('maps one SSE row to Term with backend id', () => {
    expect(
      mapToTerm({
        id: '42',
        term: '  量子計算  ',
        description: ' 量子ビットを用いる計算方式 ',
        score: 0.42,
        source: 'db',
      }),
    ).toEqual({
      ...emptyLegacy,
      id: '42',
      word: '量子計算',
      shortDesc: '量子ビットを用いる計算方式',
      longDesc: '量子ビットを用いる計算方式',
      score: 0.42,
    })
  })

  it('maps empty description when missing', () => {
    expect(
      mapToTerm({
        id: '7',
        term: 'API',
        description: '',
        score: 1,
        source: 'llm',
      }),
    ).toEqual({
      ...emptyLegacy,
      id: '7',
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
          id: '1',
          term: 'a',
          description: '説明A',
          score: 0.1,
          source: 'db',
        },
        {
          id: '2',
          term: 'b',
          description: '説明B',
          score: 0.2,
          source: 'llm',
        },
      ]),
    ).toEqual([
      {
        ...emptyLegacy,
        id: '1',
        word: 'a',
        shortDesc: '説明A',
        longDesc: '説明A',
        score: 0.1,
      },
      {
        ...emptyLegacy,
        id: '2',
        word: 'b',
        shortDesc: '説明B',
        longDesc: '説明B',
        score: 0.2,
      },
    ])
  })
})
