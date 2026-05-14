import { create } from 'zustand'

const STORAGE_KEY = 'talkscope.contentFontScale.v1'
export const CONTENT_FONT_SCALE_MIN = 0.85
export const CONTENT_FONT_SCALE_MAX = 1.35
export const CONTENT_FONT_SCALE_DEFAULT = 1

function clampScale(v: number): number {
  return Math.round(Math.min(CONTENT_FONT_SCALE_MAX, Math.max(CONTENT_FONT_SCALE_MIN, v)) * 100) / 100
}

function readStored(): number {
  if (typeof window === 'undefined') return CONTENT_FONT_SCALE_DEFAULT
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw == null) return CONTENT_FONT_SCALE_DEFAULT
    const n = Number(raw)
    return Number.isFinite(n) ? clampScale(n) : CONTENT_FONT_SCALE_DEFAULT
  } catch {
    return CONTENT_FONT_SCALE_DEFAULT
  }
}

interface ContentFontScaleState {
  scale: number
  setScale: (v: number) => void
}

export const useContentFontScaleStore = create<ContentFontScaleState>((set) => ({
  scale: typeof window !== 'undefined' ? readStored() : CONTENT_FONT_SCALE_DEFAULT,
  setScale: (v) => {
    const scale = clampScale(v)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(scale))
    } catch {
      /* ignore */
    }
    set({ scale })
  },
}))
