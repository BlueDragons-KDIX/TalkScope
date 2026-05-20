import { beforeEach, describe, expect, it } from 'bun:test'
import {
  IMPORTANCE_RANKING_FONT_SIZE_MAX,
  IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MIN,
  IMPORTANCE_RANKING_VISIBLE_COUNT_MAX,
  useImportanceRankingWindowSettingsStore,
} from '../importanceRankingWindowSettingsStore'

const STORAGE_KEY = 'talkscope:importance-ranking-window-settings'

describe('importanceRankingWindowSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useImportanceRankingWindowSettingsStore.setState({
      masterSizeScale: 1,
      fontSizePx: 18,
      visibleCount: 6,
    })
  })

  it('表示設定を保存できる', () => {
    useImportanceRankingWindowSettingsStore.getState().setMasterSizeScale(1.25)
    useImportanceRankingWindowSettingsStore.getState().setFontSizePx(20)
    useImportanceRankingWindowSettingsStore.getState().setVisibleCount(8)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(useImportanceRankingWindowSettingsStore.getState().masterSizeScale).toBe(1.25)
    expect(useImportanceRankingWindowSettingsStore.getState().fontSizePx).toBe(20)
    expect(useImportanceRankingWindowSettingsStore.getState().visibleCount).toBe(8)
    expect(stored.masterSizeScale).toBe(1.25)
    expect(stored.fontSizePx).toBe(20)
    expect(stored.visibleCount).toBe(8)
  })

  it('範囲外の値はクランプする', () => {
    useImportanceRankingWindowSettingsStore.getState().setMasterSizeScale(0)
    useImportanceRankingWindowSettingsStore.getState().setFontSizePx(99)
    useImportanceRankingWindowSettingsStore.getState().setVisibleCount(99)

    expect(useImportanceRankingWindowSettingsStore.getState().masterSizeScale).toBe(IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MIN)
    expect(useImportanceRankingWindowSettingsStore.getState().fontSizePx).toBe(IMPORTANCE_RANKING_FONT_SIZE_MAX)
    expect(useImportanceRankingWindowSettingsStore.getState().visibleCount).toBe(IMPORTANCE_RANKING_VISIBLE_COUNT_MAX)
  })
})
