import { describe, expect, it } from 'bun:test'
import {
  CLICK_DELTA,
  DefaultScoreUpdateStrategy,
  FREQUENCY_DELTA,
} from '../DefaultScoreUpdateStrategy'

describe('DefaultScoreUpdateStrategy', () => {
  const strategy = new DefaultScoreUpdateStrategy()

  it('onFrequency は 0.01 を加算する', () => {
    expect(strategy.onFrequency(0.42, 3)).toBe(0.42 + FREQUENCY_DELTA)
  })

  it('onClick は 0.01 を加算する', () => {
    expect(strategy.onClick(0.42)).toBe(0.42 + CLICK_DELTA)
  })
})
