import { describe, expect, it } from 'bun:test'
import { stripTrailingSentenceDelimiters } from '../sentenceSplit'

describe('stripTrailingSentenceDelimiters', () => {
  it('文末の句点を除去する', () => {
    expect(stripTrailingSentenceDelimiters('話し途中の文。')).toBe('話し途中の文')
    expect(stripTrailingSentenceDelimiters('hello.')).toBe('hello')
  })

  it('句点がなければそのまま', () => {
    expect(stripTrailingSentenceDelimiters('話し途中の文')).toBe('話し途中の文')
  })
})
