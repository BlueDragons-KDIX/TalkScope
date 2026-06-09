import { beforeEach, describe, expect, it } from 'bun:test'
import {
  HISTORY_WINDOW_FONT_SIZE_MAX,
  HISTORY_WINDOW_FONT_SIZE_MIN,
  useHistoryWindowSettingsStore,
} from '../historyWindowSettingsStore'

const STORAGE_KEY = 'talkscope:history-window-settings'

describe('historyWindowSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useHistoryWindowSettingsStore.setState({
      fontSizePx: 12,
    })
  })

  it('フォントサイズを保存できる', () => {
    useHistoryWindowSettingsStore.getState().setFontSizePx(16)

    expect(useHistoryWindowSettingsStore.getState().fontSizePx).toBe(16)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').fontSizePx).toBe(16)
  })

  it('範囲外の値はクランプする', () => {
    useHistoryWindowSettingsStore.getState().setFontSizePx(99)
    expect(useHistoryWindowSettingsStore.getState().fontSizePx).toBe(HISTORY_WINDOW_FONT_SIZE_MAX)

    useHistoryWindowSettingsStore.getState().setFontSizePx(1)
    expect(useHistoryWindowSettingsStore.getState().fontSizePx).toBe(HISTORY_WINDOW_FONT_SIZE_MIN)
  })
})
