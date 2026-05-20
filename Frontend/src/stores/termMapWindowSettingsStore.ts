import { create } from 'zustand'

const STORAGE_KEY = 'talkscope:term-map-window-settings'

export const TERM_MAP_MASTER_SIZE_SCALE_MIN = 0.7
export const TERM_MAP_MASTER_SIZE_SCALE_MAX = 1.6
export const TERM_MAP_BUBBLE_SIZE_SCALE_MIN = 0.5
export const TERM_MAP_BUBBLE_SIZE_SCALE_MAX = 2
export const TERM_MAP_TEXT_FONT_SIZE_MIN = 8
export const TERM_MAP_TEXT_FONT_SIZE_MAX = 20
export const TERM_MAP_AUTO_SWITCH_INTERVAL_MIN = 1
export const TERM_MAP_AUTO_SWITCH_INTERVAL_MAX = 10

export interface TermMapWindowSettings {
  masterSizeScale: number
  bubbleSizeScale: number
  textFontSizePx: number
  autoSwitchEnabled: boolean
  autoSwitchIntervalSec: number
}

interface TermMapWindowSettingsState extends TermMapWindowSettings {
  setMasterSizeScale: (value: number) => void
  setBubbleSizeScale: (value: number) => void
  setTextFontSizePx: (value: number) => void
  setAutoSwitchEnabled: (value: boolean) => void
  setAutoSwitchIntervalSec: (value: number) => void
}

const DEFAULT_SETTINGS: TermMapWindowSettings = {
  masterSizeScale: 1,
  bubbleSizeScale: 1,
  textFontSizePx: 12,
  autoSwitchEnabled: false,
  autoSwitchIntervalSec: 4,
}

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

const roundToStep = (value: number): number => Math.round(value * 100) / 100

const normalizeSettings = (settings: Partial<TermMapWindowSettings>): TermMapWindowSettings => ({
  masterSizeScale: roundToStep(clamp(
    TERM_MAP_MASTER_SIZE_SCALE_MIN,
    TERM_MAP_MASTER_SIZE_SCALE_MAX,
    settings.masterSizeScale ?? DEFAULT_SETTINGS.masterSizeScale,
  )),
  bubbleSizeScale: roundToStep(clamp(
    TERM_MAP_BUBBLE_SIZE_SCALE_MIN,
    TERM_MAP_BUBBLE_SIZE_SCALE_MAX,
    settings.bubbleSizeScale ?? DEFAULT_SETTINGS.bubbleSizeScale,
  )),
  textFontSizePx: Math.round(clamp(
    TERM_MAP_TEXT_FONT_SIZE_MIN,
    TERM_MAP_TEXT_FONT_SIZE_MAX,
    settings.textFontSizePx ?? DEFAULT_SETTINGS.textFontSizePx,
  )),
  autoSwitchEnabled: Boolean(settings.autoSwitchEnabled ?? DEFAULT_SETTINGS.autoSwitchEnabled),
  autoSwitchIntervalSec: Math.round(clamp(
    TERM_MAP_AUTO_SWITCH_INTERVAL_MIN,
    TERM_MAP_AUTO_SWITCH_INTERVAL_MAX,
    settings.autoSwitchIntervalSec ?? DEFAULT_SETTINGS.autoSwitchIntervalSec,
  )),
})

const loadSettings = (): TermMapWindowSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return normalizeSettings(JSON.parse(raw) as Partial<TermMapWindowSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

const saveSettings = (settings: TermMapWindowSettings): void => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export const useTermMapWindowSettingsStore = create<TermMapWindowSettingsState>((set, get) => ({
  ...loadSettings(),

  setMasterSizeScale: (value) => {
    const next = normalizeSettings({ ...get(), masterSizeScale: value })
    saveSettings(next)
    set(next)
  },

  setBubbleSizeScale: (value) => {
    const next = normalizeSettings({ ...get(), bubbleSizeScale: value })
    saveSettings(next)
    set(next)
  },

  setTextFontSizePx: (value) => {
    const next = normalizeSettings({ ...get(), textFontSizePx: value })
    saveSettings(next)
    set(next)
  },

  setAutoSwitchEnabled: (value) => {
    const next = normalizeSettings({ ...get(), autoSwitchEnabled: value })
    saveSettings(next)
    set(next)
  },

  setAutoSwitchIntervalSec: (value) => {
    const next = normalizeSettings({ ...get(), autoSwitchIntervalSec: value })
    saveSettings(next)
    set(next)
  },
}))
