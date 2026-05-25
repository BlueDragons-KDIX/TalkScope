import { describe, it, expect } from 'bun:test'
import { findMockImportantTermsInText, MOCK_IMPORTANT_TERMS } from '../mockImportantTerms'

describe('findMockImportantTermsInText', () => {
  it('空文字では何も返さない', () => {
    expect(findMockImportantTermsInText('')).toHaveLength(0)
  })

  it('即時デモ文から複数のモック語を検出する', () => {
    const text =
      'ReactとTypeScriptを使い、DockerでAWSへデプロイ。CI/CDとGitHub、SQLとNoSQL、LLMも扱うAPIです。'
    const found = findMockImportantTermsInText(text)
    const ids = new Set(found.map(t => t.id))
    expect(ids.has('demo-important-react')).toBe(true)
    expect(ids.has('demo-important-typescript')).toBe(true)
    expect(ids.has('demo-important-docker')).toBe(true)
    expect(found.length).toBeGreaterThanOrEqual(5)
  })

  it('語が無ければリストに含めない', () => {
    const text = 'あいうえおのみの文章です。'
    const found = findMockImportantTermsInText(text)
    expect(found).toHaveLength(0)
  })

  it('MOCK_IMPORTANT_TERMS はすべて demo-important- ID を持つ', () => {
    for (const t of MOCK_IMPORTANT_TERMS) {
      expect(t.id.startsWith('demo-important-')).toBe(true)
    }
  })
})
