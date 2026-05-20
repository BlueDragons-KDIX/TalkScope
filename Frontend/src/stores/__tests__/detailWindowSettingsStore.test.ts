import { beforeEach, describe, expect, it } from 'bun:test'
import {
  DETAIL_WINDOW_FONT_SIZE_MAX,
  DETAIL_WINDOW_FONT_SIZE_MIN,
  useDetailWindowSettingsStore,
} from '../detailWindowSettingsStore'

const STORAGE_KEY = 'talkscope:detail-window-settings'

describe('detailWindowSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useDetailWindowSettingsStore.setState({
      fontSizePx: 14,
    })
  })

  it('フォントサイズを保存できる', () => {
    useDetailWindowSettingsStore.getState().setFontSizePx(18)

    expect(useDetailWindowSettingsStore.getState().fontSizePx).toBe(18)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').fontSizePx).toBe(18)
  })

  it('範囲外の値はクランプする', () => {
    useDetailWindowSettingsStore.getState().setFontSizePx(99)
    expect(useDetailWindowSettingsStore.getState().fontSizePx).toBe(DETAIL_WINDOW_FONT_SIZE_MAX)

    useDetailWindowSettingsStore.getState().setFontSizePx(1)
    expect(useDetailWindowSettingsStore.getState().fontSizePx).toBe(DETAIL_WINDOW_FONT_SIZE_MIN)
  })
})
