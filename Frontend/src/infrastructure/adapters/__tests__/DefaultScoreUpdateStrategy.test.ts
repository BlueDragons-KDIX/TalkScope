import { describe, expect, it } from 'bun:test'
import {
  CLICK_DELTA,
  DefaultScoreUpdateStrategy,
  FREQUENCY_DELTA,
} from '../DefaultScoreUpdateStrategy'

describe('DefaultScoreUpdateStrategy', () => {
  const strategy = new DefaultScoreUpdateStrategy()

  it('onFrequency は固定量を加算する', () => {
    expect(strategy.onFrequency(0.4, 3)).toBe(0.4 + FREQUENCY_DELTA)
  })

  it('onClick は固定量を加算する', () => {
    expect(strategy.onClick(0.4)).toBe(0.4 + CLICK_DELTA)
  })
})
