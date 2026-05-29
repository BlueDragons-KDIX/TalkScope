import { create } from 'zustand'

const STORAGE_KEY = 'talkscope:history-window-settings'

export const HISTORY_WINDOW_FONT_SIZE_MIN = 10
export const HISTORY_WINDOW_FONT_SIZE_MAX = 24

export interface HistoryWindowSettings {
  fontSizePx: number
}

interface HistoryWindowSettingsState extends HistoryWindowSettings {
  setFontSizePx: (value: number) => void
}

const DEFAULT_SETTINGS: HistoryWindowSettings = {
  fontSizePx: 12,
}

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

const normalizeSettings = (settings: Partial<HistoryWindowSettings>): HistoryWindowSettings => ({
  fontSizePx: Math.round(clamp(
    HISTORY_WINDOW_FONT_SIZE_MIN,
    HISTORY_WINDOW_FONT_SIZE_MAX,
    settings.fontSizePx ?? DEFAULT_SETTINGS.fontSizePx,
  )),
})

const loadSettings = (): HistoryWindowSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return normalizeSettings(JSON.parse(raw) as Partial<HistoryWindowSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

const saveSettings = (settings: HistoryWindowSettings): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useHistoryWindowSettingsStore = create<HistoryWindowSettingsState>((set, get) => ({
  ...loadSettings(),

  setFontSizePx: (value) => {
    const next = normalizeSettings({ ...get(), fontSizePx: value })
    saveSettings(next)
    set(next)
  },
}))
