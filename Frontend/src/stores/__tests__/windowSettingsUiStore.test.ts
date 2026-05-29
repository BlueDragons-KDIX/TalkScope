import { beforeEach, describe, expect, it } from 'bun:test'
import { useWindowSettingsUiStore } from '../windowSettingsUiStore'

describe('windowSettingsUiStore', () => {
  beforeEach(() => {
    useWindowSettingsUiStore.setState({ openWindowId: null })
  })

  it('初期状態は null', () => {
    expect(useWindowSettingsUiStore.getState().openWindowId).toBeNull()
  })

  it('ウィンドウ ID を開閉できる', () => {
    useWindowSettingsUiStore.getState().setOpenWindowId('bubbleCloud')
    expect(useWindowSettingsUiStore.getState().openWindowId).toBe('bubbleCloud')

    useWindowSettingsUiStore.getState().setOpenWindowId(null)
    expect(useWindowSettingsUiStore.getState().openWindowId).toBeNull()
  })

  it('別ウィンドウを開くと ID が置き換わる', () => {
    useWindowSettingsUiStore.getState().setOpenWindowId('detail')
    useWindowSettingsUiStore.getState().setOpenWindowId('history')
    expect(useWindowSettingsUiStore.getState().openWindowId).toBe('history')
  })
})
