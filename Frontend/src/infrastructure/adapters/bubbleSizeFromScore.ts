/** フィルター通過後のスコア帯（0.42〜0.45 付近）で段階的にサイズが変わるよう、×100 してから引くオフセット */
export const BUBBLE_IMPORTANCE_SCORE_OFFSET = 41

export const BUBBLE_RADIUS_BASE = 20
/** 重要度レベル 1 あたりの半径加算（px、scaleFactor 適用前） */
export const BUBBLE_RADIUS_PER_IMPORTANCE_LEVEL = 6
export const BUBBLE_RADIUS_MAX = 95
export const PINNED_BUBBLE_RADIUS = 38

/**
 * スコアをバブル重要度レベルに変換する。
 * 例: 0.42 → 42 - 41 = 1、0.45 → 4。クリック等で +0.01 するとレベルが 1 ずつ上がる。
 */
export function scoreToBubbleImportanceLevel(score: number): number {
  return Math.max(1, Math.round(score * 100) - BUBBLE_IMPORTANCE_SCORE_OFFSET)
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

  const baseRadius =
    BUBBLE_RADIUS_BASE + (Math.max(1, level) - 1) * BUBBLE_RADIUS_PER_IMPORTANCE_LEVEL
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
