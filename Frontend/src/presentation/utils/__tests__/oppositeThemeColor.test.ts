import { describe, expect, it } from 'bun:test'
import { getOppositeThemeColor } from '../oppositeThemeColor'

describe('getOppositeThemeColor', () => {
  it('blue と orange が双対', () => {
    expect(getOppositeThemeColor('blue')).toBe('orange')
    expect(getOppositeThemeColor('orange')).toBe('blue')
  })

  it('rose と emerald が双対', () => {
    expect(getOppositeThemeColor('rose')).toBe('emerald')
    expect(getOppositeThemeColor('emerald')).toBe('rose')
  })

  it('indigo は orange、purple は emerald', () => {
    expect(getOppositeThemeColor('indigo')).toBe('orange')
    expect(getOppositeThemeColor('purple')).toBe('emerald')
  })

  it('マップにないキーはそのまま返す', () => {
    expect(getOppositeThemeColor('unknown')).toBe('unknown')
  })
})
