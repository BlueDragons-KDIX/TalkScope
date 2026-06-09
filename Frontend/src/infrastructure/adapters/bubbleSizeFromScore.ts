/** フィルター通過後のスコア帯（0.42〜0.45 付近）で段階的にサイズが変わるよう、×100 してから引くオフセット */
export const BUBBLE_IMPORTANCE_SCORE_OFFSET = 41

/** 想定する運用上の最大重要度（スコア 0.49 前後・クリック蓄積まで） */
export const BUBBLE_IMPORTANCE_LEVEL_DESIGN_MAX = 8

export const BUBBLE_RADIUS_BASE = 20
/** 重要度レベル 1 あたりの半径加算（px、scaleFactor 適用前） */
export const BUBBLE_RADIUS_PER_IMPORTANCE_LEVEL = 6
/**
 * スケール適用後の半径上限（px）。
 * レベル8（基準 62px）がウィンドウ倍率 ~1.7 程度まで頭打ちにならないよう 110 に設定。
 */
export const BUBBLE_RADIUS_MAX = 110
export const PINNED_BUBBLE_RADIUS = 38

/** レベル8時の基準半径（scaleFactor・ユーザー倍率適用前） */
export const BUBBLE_RADIUS_AT_DESIGN_MAX_LEVEL =
  BUBBLE_RADIUS_BASE
  + (BUBBLE_IMPORTANCE_LEVEL_DESIGN_MAX - 1) * BUBBLE_RADIUS_PER_IMPORTANCE_LEVEL

/** スコア換算で設計最大レベルに相当するおおよそのスコア（round(score×100)-41 = 8 → 0.49） */
export const BUBBLE_SCORE_AT_DESIGN_MAX_LEVEL =
  (BUBBLE_IMPORTANCE_SCORE_OFFSET + BUBBLE_IMPORTANCE_LEVEL_DESIGN_MAX) / 100

/**
 * スコアをバブル重要度レベルに変換する。
 * 例: 0.42 → 1、0.45 → 4、0.49 → 8。クリック等で +0.01 するとレベルが 1 ずつ上がる。
 * スコアがそれ以上でもレベルは上がり続ける（上限は半径側でクリップ）。
 */
export function scoreToBubbleImportanceLevel(score: number): number {
  return Math.max(1, Math.round(score * 100) - BUBBLE_IMPORTANCE_SCORE_OFFSET)
}

/** レベルから基準半径（スケール・上限適用前）を返す */
export function bubbleBaseRadiusForLevel(level: number): number {
  return BUBBLE_RADIUS_BASE
    + (Math.max(1, level) - 1) * BUBBLE_RADIUS_PER_IMPORTANCE_LEVEL
}

export interface BubbleRadiusOptions {
  scaleFactor?: number
  effectiveBubbleScale?: number
  isPinned?: boolean
}

/**
 * 重要度レベルからバブル半径（px）を算出する。
 */
export function bubbleRadiusFromImportanceLevel(
  level: number,
  options: BubbleRadiusOptions = {},
): number {
  const {
    scaleFactor = 1,
    effectiveBubbleScale = 1,
    isPinned = false,
  } = options

  if (isPinned) {
    return Math.max(BUBBLE_RADIUS_BASE, PINNED_BUBBLE_RADIUS * scaleFactor * effectiveBubbleScale)
  }

  const baseRadius = bubbleBaseRadiusForLevel(level)
  let r = baseRadius * scaleFactor * effectiveBubbleScale
  r = Math.min(r, BUBBLE_RADIUS_MAX)
  return Math.max(BUBBLE_RADIUS_BASE, r)
}

export function bubbleRadiusFromScore(
  score: number,
  options: BubbleRadiusOptions = {},
): number {
  return bubbleRadiusFromImportanceLevel(scoreToBubbleImportanceLevel(score), options)
}
