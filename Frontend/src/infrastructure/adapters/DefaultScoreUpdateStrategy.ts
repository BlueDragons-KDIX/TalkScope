import type { IScoreUpdateStrategy } from '../../domain/interfaces'

export const FREQUENCY_DELTA = 0.05
export const CLICK_DELTA = 0.1

export class DefaultScoreUpdateStrategy implements IScoreUpdateStrategy {
  onFrequency(currentScore: number, _count: number): number {
    return currentScore + FREQUENCY_DELTA
  }

  onClick(currentScore: number): number {
    return currentScore + CLICK_DELTA
  }
}

export const defaultScoreUpdateStrategy = new DefaultScoreUpdateStrategy()
