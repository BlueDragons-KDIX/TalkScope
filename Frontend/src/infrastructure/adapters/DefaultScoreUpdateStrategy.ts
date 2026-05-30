import type { IScoreUpdateStrategy } from '../../domain/interfaces'

/** 0.42 帯では score×100 の整数部が重要度レベルになるため、再出現・クリックは 0.01 刻み */
export const FREQUENCY_DELTA = 0.01
export const CLICK_DELTA = 0.01

export class DefaultScoreUpdateStrategy implements IScoreUpdateStrategy {
  onFrequency(currentScore: number, _count: number): number {
    return currentScore + FREQUENCY_DELTA
  }

  onClick(currentScore: number): number {
    return currentScore + CLICK_DELTA
  }
}

export const defaultScoreUpdateStrategy = new DefaultScoreUpdateStrategy()
