import { describe, expect, it } from 'bun:test'
import {
  buildReferDictScoreStreamUrl,
  parseTermRowsFromEventData,
  REFER_DICT_SCORE_STREAM_PATH,
} from '../referDictScoreStream'

describe('referDictScoreStream', () => {
  it('builds absolute stream URL when baseUrl is set', () => {
    const url = buildReferDictScoreStreamUrl('量子計算と画像認識', 'http://127.0.0.1:8000')
    expect(url).toContain(REFER_DICT_SCORE_STREAM_PATH)
    expect(url).toContain('text=')
    expect(decodeURIComponent(url)).toContain('量子計算と画像認識')
    expect(url.startsWith('http://127.0.0.1:8000')).toBe(true)
  })

  it('builds relative stream URL when baseUrl is empty', () => {
    const url = buildReferDictScoreStreamUrl('API', '')
    expect(url).toBe(`${REFER_DICT_SCORE_STREAM_PATH}?text=API`)
  })

  it('parses SSE data array as TermRow[]', () => {
    const rows = parseTermRowsFromEventData(
      JSON.stringify([
        {
          id: '量子計算',
          term: '量子計算',
          description: '説明',
          score: 0.5,
          source: 'db',
        },
      ]),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe('量子計算')
    expect(rows[0]?.score).toBe(0.5)
  })

  it('rejects non-array SSE payload', () => {
    expect(() => parseTermRowsFromEventData('{}')).toThrow('SSE data must be a JSON array')
  })
})
