export interface IScoreUpdateStrategy {
  /** 頻度加算: 現在スコアと出現回数から新スコアを返す */
  onFrequency(currentScore: number, count: number): number
  /** クリック加算: 現在スコアから新スコアを返す */
  onClick(currentScore: number): number
}
