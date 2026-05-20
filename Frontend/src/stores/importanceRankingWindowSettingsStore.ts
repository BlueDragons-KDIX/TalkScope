import { create } from 'zustand'

const STORAGE_KEY = 'talkscope:importance-ranking-window-settings'

export const IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MIN = 0.7
export const IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MAX = 1.6
export const IMPORTANCE_RANKING_FONT_SIZE_MIN = 10
export const IMPORTANCE_RANKING_FONT_SIZE_MAX = 24
export const IMPORTANCE_RANKING_VISIBLE_COUNT_MIN = 1
export const IMPORTANCE_RANKING_VISIBLE_COUNT_MAX = 10

export interface ImportanceRankingWindowSettings {
  masterSizeScale: number
  fontSizePx: number
  visibleCount: number
}

interface ImportanceRankingWindowSettingsState extends ImportanceRankingWindowSettings {
  setMasterSizeScale: (value: number) => void
  setFontSizePx: (value: number) => void
  setVisibleCount: (value: number) => void
}

const DEFAULT_SETTINGS: ImportanceRankingWindowSettings = {
  masterSizeScale: 1,
  fontSizePx: 18,
  visibleCount: 6,
}

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

const roundToStep = (value: number): number => Math.round(value * 100) / 100

const normalizeSettings = (
  settings: Partial<ImportanceRankingWindowSettings>,
): ImportanceRankingWindowSettings => ({
  masterSizeScale: roundToStep(clamp(
    IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MIN,
    IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MAX,
    settings.masterSizeScale ?? DEFAULT_SETTINGS.masterSizeScale,
  )),
  fontSizePx: Math.round(clamp(
    IMPORTANCE_RANKING_FONT_SIZE_MIN,
    IMPORTANCE_RANKING_FONT_SIZE_MAX,
    settings.fontSizePx ?? DEFAULT_SETTINGS.fontSizePx,
  )),
  visibleCount: Math.round(clamp(
    IMPORTANCE_RANKING_VISIBLE_COUNT_MIN,
    IMPORTANCE_RANKING_VISIBLE_COUNT_MAX,
    settings.visibleCount ?? DEFAULT_SETTINGS.visibleCount,
  )),
})

const loadSettings = (): ImportanceRankingWindowSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return normalizeSettings(JSON.parse(raw) as Partial<ImportanceRankingWindowSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

const saveSettings = (settings: ImportanceRankingWindowSettings): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useImportanceRankingWindowSettingsStore = create<ImportanceRankingWindowSettingsState>((set, get) => ({
  ...loadSettings(),

  setMasterSizeScale: (value) => {
    const next = normalizeSettings({ ...get(), masterSizeScale: value })
    saveSettings(next)
    set(next)
  },

  setFontSizePx: (value) => {
    const next = normalizeSettings({ ...get(), fontSizePx: value })
    saveSettings(next)
    set(next)
  },

  setVisibleCount: (value) => {
    const next = normalizeSettings({ ...get(), visibleCount: value })
    saveSettings(next)
    set(next)
  },
}))
