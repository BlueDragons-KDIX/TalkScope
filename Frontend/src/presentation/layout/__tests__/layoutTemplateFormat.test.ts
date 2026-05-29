import { describe, expect, it } from 'bun:test'
import type { LayoutNode } from '../../../domain/entities/Layout'
import {
  capturePresentationSnapshot,
  formatPresentationSnapshotExport,
  parseLayoutTemplateText,
  parsePresentationSnapshotText,
} from '../presentationSnapshot'
import { useContentFontScaleStore } from '../../../stores/contentFontScaleStore'
import { usePresentationAppearanceStore } from '../../../stores/presentationAppearanceStore'
import { useFloatingControlDockUiStore } from '../../../stores/floatingControlDockUiStore'
import { useTermMapWindowSettingsStore } from '../../../stores/termMapWindowSettingsStore'

const sampleLayout: LayoutNode = {
  type: 'split',
  id: 'n1',
  direction: 'h',
  ratio: 0.35,
  a: { type: 'leaf', id: 'n2', windowId: 'transcription' },
  b: { type: 'leaf', id: 'n3', windowId: 'bubbleCloud' },
}

describe('presentationSnapshot', () => {
  it('JSON のレイアウト情報を LayoutNode として読み込める（後方互換）', () => {
    expect(parseLayoutTemplateText(JSON.stringify(sampleLayout, null, 2))).toEqual(sampleLayout)
  })

  it('フルスナップショットをエクスポート・インポートできる', () => {
    usePresentationAppearanceStore.setState({
      darkMode: false,
      themeColor: 'rose',
      applyAppearance: usePresentationAppearanceStore.getState().applyAppearance,
    })
    useContentFontScaleStore.setState({
      scale: 1.1,
      setScale: useContentFontScaleStore.getState().setScale,
    })
    useFloatingControlDockUiStore.setState({
      position: { x: 120, y: 240 },
      scale: 1.2,
      setPosition: useFloatingControlDockUiStore.getState().setPosition,
      setScale: useFloatingControlDockUiStore.getState().setScale,
      applyUiState: useFloatingControlDockUiStore.getState().applyUiState,
    })
    useTermMapWindowSettingsStore.setState({
      ...useTermMapWindowSettingsStore.getState(),
      maxVisibleTerms: 18,
    })

    const snapshot = capturePresentationSnapshot('during', sampleLayout)
    const text = formatPresentationSnapshotExport(snapshot)
    expect(text.startsWith('{')).toBe(true)
    expect(text.includes('//')).toBe(false)
    const parsed = parsePresentationSnapshotText(text)

    expect(parsed.layout).toEqual(sampleLayout)
    expect(parsed.appearance.darkMode).toBe(false)
    expect(parsed.appearance.themeColor).toBe('rose')
    expect(parsed.contentFontScale).toBe(1.1)
    expect(parsed.floatingControlDock.position).toEqual({ x: 120, y: 240 })
    expect(parsed.floatingControlDock.scale).toBe(1.2)
    expect(parsed.windowSettings.bubbleCloud.maxVisibleTerms).toBe(18)
  })

  it('windowId のない leaf は拒否する', () => {
    expect(() => parseLayoutTemplateText('{"type":"leaf","id":"n1"}')).toThrow()
  })
})
