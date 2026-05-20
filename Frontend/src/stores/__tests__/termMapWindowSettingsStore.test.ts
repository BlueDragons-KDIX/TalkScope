import { beforeEach, describe, expect, it } from 'bun:test'
import {
  TERM_MAP_AUTO_SWITCH_INTERVAL_MAX,
  TERM_MAP_BUBBLE_SIZE_SCALE_MAX,
  TERM_MAP_MASTER_SIZE_SCALE_MIN,
  TERM_MAP_TEXT_FONT_SIZE_MIN,
  useTermMapWindowSettingsStore,
} from '../termMapWindowSettingsStore'

const STORAGE_KEY = 'talkscope:term-map-window-settings'

describe('termMapWindowSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useTermMapWindowSettingsStore.setState({
      masterSizeScale: 1,
      bubbleSizeScale: 1,
      textFontSizePx: 12,
      autoSwitchEnabled: false,
      autoSwitchIntervalSec: 4,
    })
  })

  it('サイズ設定を保存できる', () => {
    useTermMapWindowSettingsStore.getState().setMasterSizeScale(1.25)
    useTermMapWindowSettingsStore.getState().setBubbleSizeScale(1.4)
    useTermMapWindowSettingsStore.getState().setTextFontSizePx(16)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(useTermMapWindowSettingsStore.getState().masterSizeScale).toBe(1.25)
    expect(useTermMapWindowSettingsStore.getState().bubbleSizeScale).toBe(1.4)
    expect(useTermMapWindowSettingsStore.getState().textFontSizePx).toBe(16)
    expect(stored.masterSizeScale).toBe(1.25)
    expect(stored.bubbleSizeScale).toBe(1.4)
    expect(stored.textFontSizePx).toBe(16)
  })

  it('自動切り替え設定を保存できる', () => {
    useTermMapWindowSettingsStore.getState().setAutoSwitchEnabled(true)
    useTermMapWindowSettingsStore.getState().setAutoSwitchIntervalSec(7)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(useTermMapWindowSettingsStore.getState().autoSwitchEnabled).toBe(true)
    expect(useTermMapWindowSettingsStore.getState().autoSwitchIntervalSec).toBe(7)
    expect(stored.autoSwitchEnabled).toBe(true)
    expect(stored.autoSwitchIntervalSec).toBe(7)
  })

  it('範囲外の値はクランプする', () => {
    useTermMapWindowSettingsStore.getState().setMasterSizeScale(0)
    useTermMapWindowSettingsStore.getState().setBubbleSizeScale(99)
    useTermMapWindowSettingsStore.getState().setTextFontSizePx(1)
    useTermMapWindowSettingsStore.getState().setAutoSwitchIntervalSec(99)

    expect(useTermMapWindowSettingsStore.getState().masterSizeScale).toBe(TERM_MAP_MASTER_SIZE_SCALE_MIN)
    expect(useTermMapWindowSettingsStore.getState().bubbleSizeScale).toBe(TERM_MAP_BUBBLE_SIZE_SCALE_MAX)
    expect(useTermMapWindowSettingsStore.getState().textFontSizePx).toBe(TERM_MAP_TEXT_FONT_SIZE_MIN)
    expect(useTermMapWindowSettingsStore.getState().autoSwitchIntervalSec).toBe(TERM_MAP_AUTO_SWITCH_INTERVAL_MAX)
  })
})
