import { create } from 'zustand'

const STORAGE_KEY = 'talkscope:detail-window-settings'

export const DETAIL_WINDOW_FONT_SIZE_MIN = 10
export const DETAIL_WINDOW_FONT_SIZE_MAX = 24

export interface DetailWindowSettings {
  fontSizePx: number
}

interface DetailWindowSettingsState extends DetailWindowSettings {
  setFontSizePx: (value: number) => void
}

const DEFAULT_SETTINGS: DetailWindowSettings = {
  fontSizePx: 14,
}

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

const normalizeSettings = (settings: Partial<DetailWindowSettings>): DetailWindowSettings => ({
  fontSizePx: Math.round(clamp(
    DETAIL_WINDOW_FONT_SIZE_MIN,
    DETAIL_WINDOW_FONT_SIZE_MAX,
    settings.fontSizePx ?? DEFAULT_SETTINGS.fontSizePx,
  )),
})

const loadSettings = (): DetailWindowSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return normalizeSettings(JSON.parse(raw) as Partial<DetailWindowSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

const saveSettings = (settings: DetailWindowSettings): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useDetailWindowSettingsStore = create<DetailWindowSettingsState>((set, get) => ({
  ...loadSettings(),

  setFontSizePx: (value) => {
    const next = normalizeSettings({ ...get(), fontSizePx: value })
    saveSettings(next)
    set(next)
  },
}))
