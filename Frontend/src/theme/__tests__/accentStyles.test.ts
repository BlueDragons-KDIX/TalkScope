import { describe, it, expect } from 'bun:test'
import { accentRgba, accentRgbSolid, micStartButtonStyle, termChipStyle, accentSliderStyle } from '../accentStyles'

describe('accentStyles', () => {
  const rgb = '99,102,241'

  it('accentRgba は rgba 文字列を返す', () => {
    expect(accentRgba(rgb, 0.5)).toBe('rgba(99,102,241,0.5)')
  })

  it('accentRgbSolid は rgb 文字列を返す', () => {
    expect(accentRgbSolid(rgb)).toBe('rgb(99,102,241)')
  })

  it('micStartButtonStyle は背景・文字色・シャドウを含む', () => {
    const dk = micStartButtonStyle(rgb, true)
    expect(dk.backgroundColor).toBe('rgb(99,102,241)')
    expect(dk.color).toBe('#fff')
    expect(dk.boxShadow).toContain('rgba(99,102,241,0.42)')
    const lt = micStartButtonStyle(rgb, false)
    expect(lt.boxShadow).toContain('rgba(99,102,241,0.28)')
  })

  it('termChipStyle はダーク/ライトで境界と背景が変わる', () => {
    const dark = termChipStyle(true, rgb)
    expect(dark.borderStyle).toBe('solid')
    expect(dark.backgroundColor).toContain('0.26')
    const light = termChipStyle(false, rgb)
    expect(light.backgroundColor).toContain('0.12')
  })

  it('accentSliderStyle は accentColor を返す', () => {
    expect(accentSliderStyle(rgb)).toEqual({ accentColor: 'rgb(99,102,241)' })
  })
})
