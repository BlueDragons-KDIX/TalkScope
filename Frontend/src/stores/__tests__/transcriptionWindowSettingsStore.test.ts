import { beforeEach, describe, expect, it } from 'bun:test'
import {
  TRANSCRIPTION_IMPORTANT_FONT_SIZE_MAX,
  TRANSCRIPTION_MASTER_FONT_SCALE_MAX,
  TRANSCRIPTION_PLAIN_FONT_SIZE_MIN,
  useTranscriptionWindowSettingsStore,
} from '../transcriptionWindowSettingsStore'

const STORAGE_KEY = 'talkscope:transcription-window-settings'

describe('transcriptionWindowSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useTranscriptionWindowSettingsStore.setState({
      masterFontScale: 1,
      plainTextFontSizePx: 14,
      importantTermFontSizePx: 14,
    })
  })

  it('マスター倍率を保存できる', () => {
    useTranscriptionWindowSettingsStore.getState().setMasterFontScale(1.25)

    expect(useTranscriptionWindowSettingsStore.getState().masterFontScale).toBe(1.25)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').masterFontScale).toBe(1.25)
  })

  it('通常文字サイズを保存できる', () => {
    useTranscriptionWindowSettingsStore.getState().setPlainTextFontSizePx(18)

    expect(useTranscriptionWindowSettingsStore.getState().plainTextFontSizePx).toBe(18)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').plainTextFontSizePx).toBe(18)
  })

  it('重要語サイズを保存できる', () => {
    useTranscriptionWindowSettingsStore.getState().setImportantTermFontSizePx(20)

    expect(useTranscriptionWindowSettingsStore.getState().importantTermFontSizePx).toBe(20)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').importantTermFontSizePx).toBe(20)
  })

  it('範囲外の値はクランプする', () => {
    useTranscriptionWindowSettingsStore.getState().setMasterFontScale(99)
    useTranscriptionWindowSettingsStore.getState().setPlainTextFontSizePx(1)
    useTranscriptionWindowSettingsStore.getState().setImportantTermFontSizePx(99)

    expect(useTranscriptionWindowSettingsStore.getState().masterFontScale).toBe(TRANSCRIPTION_MASTER_FONT_SCALE_MAX)
    expect(useTranscriptionWindowSettingsStore.getState().plainTextFontSizePx).toBe(TRANSCRIPTION_PLAIN_FONT_SIZE_MIN)
    expect(useTranscriptionWindowSettingsStore.getState().importantTermFontSizePx).toBe(TRANSCRIPTION_IMPORTANT_FONT_SIZE_MAX)
  })
})
