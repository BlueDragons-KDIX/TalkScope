import { describe, expect, it } from 'bun:test'
import {
  BUBBLE_IMPORTANCE_LEVEL_DESIGN_MAX,
  BUBBLE_IMPORTANCE_SCORE_OFFSET,
  BUBBLE_RADIUS_AT_DESIGN_MAX_LEVEL,
  BUBBLE_RADIUS_MAX,
  BUBBLE_SCORE_AT_DESIGN_MAX_LEVEL,
  bubbleRadiusFromScore,
  scoreToBubbleImportanceLevel,
} from '../bubbleSizeFromScore'

describe('scoreToBubbleImportanceLevel', () => {
  it('0.42 はレベル 1', () => {
    expect(scoreToBubbleImportanceLevel(0.42)).toBe(1)
  })

  it('0.43〜0.45 はレベルが 1 ずつ増える', () => {
    expect(scoreToBubbleImportanceLevel(0.43)).toBe(2)
    expect(scoreToBubbleImportanceLevel(0.44)).toBe(3)
    expect(scoreToBubbleImportanceLevel(0.45)).toBe(4)
  })

  it('クリック相当の +0.01 でレベルが 1 上がる', () => {
    expect(scoreToBubbleImportanceLevel(0.42 + 0.01)).toBe(2)
  })

  it('オフセット定数は 41', () => {
    expect(BUBBLE_IMPORTANCE_SCORE_OFFSET).toBe(41)
  })
})

describe('bubbleRadiusFromScore', () => {
  it('0.42 と 0.45 で半径が段階的に大きくなる', () => {
    const low = bubbleRadiusFromScore(0.42)
    const high = bubbleRadiusFromScore(0.45)
    expect(high).toBeGreaterThan(low)
  })

  it('同一スコア帯でもレベル差が視認できる幅になる', () => {
    const r42 = bubbleRadiusFromScore(0.42)
    const r43 = bubbleRadiusFromScore(0.43)
    expect(r43 - r42).toBe(6)
  })

  it('設計最大レベル8では基準半径62px・上限110px未満', () => {
    expect(scoreToBubbleImportanceLevel(BUBBLE_SCORE_AT_DESIGN_MAX_LEVEL)).toBe(
      BUBBLE_IMPORTANCE_LEVEL_DESIGN_MAX,
    )
    expect(BUBBLE_RADIUS_AT_DESIGN_MAX_LEVEL).toBe(62)
    expect(bubbleRadiusFromScore(BUBBLE_SCORE_AT_DESIGN_MAX_LEVEL)).toBe(62)
    expect(bubbleRadiusFromScore(0.52)).toBeLessThan(BUBBLE_RADIUS_MAX)
  })

  it('レベル8超でも段階的に大きくなり上限でクリップされる', () => {
    const at8 = bubbleRadiusFromScore(0.49)
    const at12 = bubbleRadiusFromScore(0.53)
    expect(at12).toBeGreaterThan(at8)
    expect(bubbleRadiusFromScore(0.99)).toBe(BUBBLE_RADIUS_MAX)
  })
})
