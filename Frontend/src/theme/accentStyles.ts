import type { CSSProperties } from 'react'

export function accentRgba(rgb: string, alpha: number): string {
  return `rgba(${rgb},${alpha})`
}

export function accentRgbSolid(rgb: string): string {
  return `rgb(${rgb})`
}

/** 文字起こし上の用語チップ・ピン表の語ボタンなど */
export function termChipStyle(dk: boolean, rgb: string): CSSProperties {
  if (dk) {
    return {
      backgroundColor: accentRgba(rgb, 0.26),
      color: accentRgba(rgb, 0.98),
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: accentRgba(rgb, 0.48),
    }
  }
  return {
    backgroundColor: accentRgba(rgb, 0.12),
    color: accentRgba(rgb, 0.95),
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: accentRgba(rgb, 0.32),
  }
}

export function micStartButtonStyle(rgb: string, dk: boolean): CSSProperties {
  return {
    backgroundColor: accentRgbSolid(rgb),
    color: '#fff',
    boxShadow: dk ? `0 12px 40px ${accentRgba(rgb, 0.42)}` : `0 10px 32px ${accentRgba(rgb, 0.28)}`,
  }
}

export function accentSliderStyle(rgb: string): CSSProperties {
  return { accentColor: accentRgbSolid(rgb) }
}
