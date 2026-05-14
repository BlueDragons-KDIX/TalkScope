/** 用語・説明文など「ウィンドウ内コンテンツ」向けの px をスケール（下限で潰れすぎ防止） */
export function scaledContentFontPx(basePx: number, scale: number): number {
  return Math.max(8, Math.round(basePx * scale))
}
