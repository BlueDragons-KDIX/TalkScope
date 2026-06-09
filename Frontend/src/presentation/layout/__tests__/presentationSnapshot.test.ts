import { beforeEach, describe, expect, it } from 'bun:test'
import type { LayoutNode } from '../../../domain/entities/Layout'
import { useLayoutStore } from '../../../stores/layoutStore'
import { useContentFontScaleStore } from '../../../stores/contentFontScaleStore'
import { usePresentationAppearanceStore } from '../../../stores/presentationAppearanceStore'
import { useFloatingControlDockUiStore } from '../../../stores/floatingControlDockUiStore'
import { useTermMapWindowSettingsStore } from '../../../stores/termMapWindowSettingsStore'
import {
  applyPresentationSnapshot,
  capturePresentationSnapshot,
  PRESENTATION_SNAPSHOT_VERSION,
} from '../presentationSnapshot'

const sampleLayout: LayoutNode = {
  type: 'leaf',
  id: 'n1',
  windowId: 'transcription',
}

describe('applyPresentationSnapshot', () => {
  beforeEach(() => {
    useLayoutStore.setState({ layouts: {} })
    usePresentationAppearanceStore.setState({
      darkMode: true,
      themeColor: 'indigo',
      applyAppearance: usePresentationAppearanceStore.getState().applyAppearance,
    })
    useContentFontScaleStore.setState({
      scale: 1,
      setScale: useContentFontScaleStore.getState().setScale,
    })
    useFloatingControlDockUiStore.setState({
      position: null,
      scale: 1,
      setPosition: useFloatingControlDockUiStore.getState().setPosition,
      setScale: useFloatingControlDockUiStore.getState().setScale,
      applyUiState: useFloatingControlDockUiStore.getState().applyUiState,
    })
    useTermMapWindowSettingsStore.setState({
      ...useTermMapWindowSettingsStore.getState(),
      maxVisibleTerms: 30,
    })
  })

  it('外観・文字サイズ・フロートUI・ウィンドウ設定を反映する', () => {
    const snapshot = {
      version: PRESENTATION_SNAPSHOT_VERSION,
      phaseId: 'during',
      layout: sampleLayout,
      appearance: { darkMode: false, themeColor: 'emerald' },
      contentFontScale: 1.15,
      floatingControlDock: {
        position: { x: 100, y: 200 },
        scale: 1.3,
      },
      windowSettings: {
        ...capturePresentationSnapshot('during', sampleLayout).windowSettings,
        bubbleCloud: {
          masterSizeScale: 1.2,
          bubbleSizeScale: 0.9,
          textFontSizePx: 14,
          autoSwitchEnabled: true,
          autoSwitchIntervalSec: 5,
          maxVisibleTerms: 8,
        },
      },
    }

    applyPresentationSnapshot(snapshot)

    expect(usePresentationAppearanceStore.getState().darkMode).toBe(false)
    expect(usePresentationAppearanceStore.getState().themeColor).toBe('emerald')
    expect(useContentFontScaleStore.getState().scale).toBe(1.15)
    expect(useFloatingControlDockUiStore.getState().position).toEqual({ x: 100, y: 200 })
    expect(useFloatingControlDockUiStore.getState().scale).toBe(1.3)
    expect(useTermMapWindowSettingsStore.getState().maxVisibleTerms).toBe(8)
    expect(useTermMapWindowSettingsStore.getState().autoSwitchEnabled).toBe(true)
  })
})
