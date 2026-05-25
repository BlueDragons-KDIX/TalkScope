import { create } from 'zustand'

const STORAGE_KEY = 'talkscope:transcription-window-settings'

export const TRANSCRIPTION_MASTER_FONT_SCALE_MIN = 0.8
export const TRANSCRIPTION_MASTER_FONT_SCALE_MAX = 1.5
export const TRANSCRIPTION_PLAIN_FONT_SIZE_MIN = 10
export const TRANSCRIPTION_PLAIN_FONT_SIZE_MAX = 24
export const TRANSCRIPTION_IMPORTANT_FONT_SIZE_MIN = 10
export const TRANSCRIPTION_IMPORTANT_FONT_SIZE_MAX = 28

export interface TranscriptionWindowSettings {
  masterFontScale: number
  plainTextFontSizePx: number
  importantTermFontSizePx: number
}

interface TranscriptionWindowSettingsState extends TranscriptionWindowSettings {
  setMasterFontScale: (value: number) => void
  setPlainTextFontSizePx: (value: number) => void
  setImportantTermFontSizePx: (value: number) => void
}

const DEFAULT_SETTINGS: TranscriptionWindowSettings = {
  masterFontScale: 1,
  plainTextFontSizePx: 14,
  importantTermFontSizePx: 14,
}

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

const roundToStep = (value: number): number => Math.round(value * 100) / 100

const normalizeSettings = (settings: Partial<TranscriptionWindowSettings>): TranscriptionWindowSettings => ({
  masterFontScale: roundToStep(clamp(
    TRANSCRIPTION_MASTER_FONT_SCALE_MIN,
    TRANSCRIPTION_MASTER_FONT_SCALE_MAX,
    settings.masterFontScale ?? DEFAULT_SETTINGS.masterFontScale,
  )),
  plainTextFontSizePx: Math.round(clamp(
    TRANSCRIPTION_PLAIN_FONT_SIZE_MIN,
    TRANSCRIPTION_PLAIN_FONT_SIZE_MAX,
    settings.plainTextFontSizePx ?? DEFAULT_SETTINGS.plainTextFontSizePx,
  )),
  importantTermFontSizePx: Math.round(clamp(
    TRANSCRIPTION_IMPORTANT_FONT_SIZE_MIN,
    TRANSCRIPTION_IMPORTANT_FONT_SIZE_MAX,
    settings.importantTermFontSizePx ?? DEFAULT_SETTINGS.importantTermFontSizePx,
  )),
})

const loadSettings = (): TranscriptionWindowSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return normalizeSettings(JSON.parse(raw) as Partial<TranscriptionWindowSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

const saveSettings = (settings: TranscriptionWindowSettings): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useTranscriptionWindowSettingsStore = create<TranscriptionWindowSettingsState>((set, get) => ({
  ...loadSettings(),

  setMasterFontScale: (value) => {
    const next = normalizeSettings({ ...get(), masterFontScale: value })
    saveSettings(next)
    set(next)
  },

  setPlainTextFontSizePx: (value) => {
    const next = normalizeSettings({ ...get(), plainTextFontSizePx: value })
    saveSettings(next)
    set(next)
  },

  setImportantTermFontSizePx: (value) => {
    const next = normalizeSettings({ ...get(), importantTermFontSizePx: value })
    saveSettings(next)
    set(next)
  },
}))
