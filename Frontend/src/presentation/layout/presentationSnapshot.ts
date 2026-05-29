import type { LayoutNode } from '../../domain/entities/Layout'
import { useLayoutStore } from '../../stores/layoutStore'
import type { DetailWindowSettings } from '../../stores/detailWindowSettingsStore'
import { useDetailWindowSettingsStore } from '../../stores/detailWindowSettingsStore'
import type { HistoryWindowSettings } from '../../stores/historyWindowSettingsStore'
import { useHistoryWindowSettingsStore } from '../../stores/historyWindowSettingsStore'
import type { ImportanceRankingWindowSettings } from '../../stores/importanceRankingWindowSettingsStore'
import { useImportanceRankingWindowSettingsStore } from '../../stores/importanceRankingWindowSettingsStore'
import type { PresentationAppearance } from '../../stores/presentationAppearanceStore'
import { usePresentationAppearanceStore } from '../../stores/presentationAppearanceStore'
import type { FloatingControlDockPosition } from '../../stores/floatingControlDockUiStore'
import { useFloatingControlDockUiStore } from '../../stores/floatingControlDockUiStore'
import { useContentFontScaleStore } from '../../stores/contentFontScaleStore'
import type { TermMapWindowSettings } from '../../stores/termMapWindowSettingsStore'
import { useTermMapWindowSettingsStore } from '../../stores/termMapWindowSettingsStore'
import type { TranscriptionWindowSettings } from '../../stores/transcriptionWindowSettingsStore'
import { useTranscriptionWindowSettingsStore } from '../../stores/transcriptionWindowSettingsStore'

export const PRESENTATION_SNAPSHOT_VERSION = 1 as const

export interface PresentationWindowSettingsSnapshot {
  bubbleCloud: TermMapWindowSettings
  transcription: TranscriptionWindowSettings
  detail: DetailWindowSettings
  importanceRanking: ImportanceRankingWindowSettings
  history: HistoryWindowSettings
}

export interface FloatingControlDockSnapshot {
  position: FloatingControlDockPosition | null
  scale: number
}

export interface PresentationSnapshot {
  version: typeof PRESENTATION_SNAPSHOT_VERSION
  phaseId: string
  layout: LayoutNode
  appearance: PresentationAppearance
  contentFontScale: number
  floatingControlDock: FloatingControlDockSnapshot
  windowSettings: PresentationWindowSettingsSnapshot
}

const pickTermMapSettings = (): TermMapWindowSettings => {
  const s = useTermMapWindowSettingsStore.getState()
  return {
    masterSizeScale: s.masterSizeScale,
    bubbleSizeScale: s.bubbleSizeScale,
    textFontSizePx: s.textFontSizePx,
    autoSwitchEnabled: s.autoSwitchEnabled,
    autoSwitchIntervalSec: s.autoSwitchIntervalSec,
    maxVisibleTerms: s.maxVisibleTerms,
  }
}

const pickTranscriptionSettings = (): TranscriptionWindowSettings => {
  const s = useTranscriptionWindowSettingsStore.getState()
  return {
    masterFontScale: s.masterFontScale,
    plainTextFontSizePx: s.plainTextFontSizePx,
    importantTermFontSizePx: s.importantTermFontSizePx,
  }
}

const pickDetailSettings = (): DetailWindowSettings => ({
  fontSizePx: useDetailWindowSettingsStore.getState().fontSizePx,
})

const pickRankingSettings = (): ImportanceRankingWindowSettings => {
  const s = useImportanceRankingWindowSettingsStore.getState()
  return {
    masterSizeScale: s.masterSizeScale,
    fontSizePx: s.fontSizePx,
    visibleCount: s.visibleCount,
  }
}

const pickHistorySettings = (): HistoryWindowSettings => ({
  fontSizePx: useHistoryWindowSettingsStore.getState().fontSizePx,
})

export function captureWindowSettingsSnapshot(): PresentationWindowSettingsSnapshot {
  return {
    bubbleCloud: pickTermMapSettings(),
    transcription: pickTranscriptionSettings(),
    detail: pickDetailSettings(),
    importanceRanking: pickRankingSettings(),
    history: pickHistorySettings(),
  }
}

export function capturePresentationSnapshot(
  phaseId: string,
  layout: LayoutNode,
): PresentationSnapshot {
  const appearance = usePresentationAppearanceStore.getState()
  const dock = useFloatingControlDockUiStore.getState()

  return {
    version: PRESENTATION_SNAPSHOT_VERSION,
    phaseId,
    layout: JSON.parse(JSON.stringify(layout)) as LayoutNode,
    appearance: {
      darkMode: appearance.darkMode,
      themeColor: appearance.themeColor,
    },
    contentFontScale: useContentFontScaleStore.getState().scale,
    floatingControlDock: {
      position: dock.position
        ? { x: dock.position.x, y: dock.position.y }
        : null,
      scale: dock.scale,
    },
    windowSettings: captureWindowSettingsSnapshot(),
  }
}

function applyTermMapSettings(settings: TermMapWindowSettings): void {
  const store = useTermMapWindowSettingsStore.getState()
  store.setMasterSizeScale(settings.masterSizeScale)
  store.setBubbleSizeScale(settings.bubbleSizeScale)
  store.setTextFontSizePx(settings.textFontSizePx)
  store.setAutoSwitchEnabled(settings.autoSwitchEnabled)
  store.setAutoSwitchIntervalSec(settings.autoSwitchIntervalSec)
  store.setMaxVisibleTerms(settings.maxVisibleTerms)
}

function applyTranscriptionSettings(settings: TranscriptionWindowSettings): void {
  const store = useTranscriptionWindowSettingsStore.getState()
  store.setMasterFontScale(settings.masterFontScale)
  store.setPlainTextFontSizePx(settings.plainTextFontSizePx)
  store.setImportantTermFontSizePx(settings.importantTermFontSizePx)
}

function applyDetailSettings(settings: DetailWindowSettings): void {
  useDetailWindowSettingsStore.getState().setFontSizePx(settings.fontSizePx)
}

function applyRankingSettings(settings: ImportanceRankingWindowSettings): void {
  const store = useImportanceRankingWindowSettingsStore.getState()
  store.setMasterSizeScale(settings.masterSizeScale)
  store.setFontSizePx(settings.fontSizePx)
  store.setVisibleCount(settings.visibleCount)
}

function applyHistorySettings(settings: HistoryWindowSettings): void {
  useHistoryWindowSettingsStore.getState().setFontSizePx(settings.fontSizePx)
}

export function applyWindowSettingsSnapshot(settings: PresentationWindowSettingsSnapshot): void {
  applyTermMapSettings(settings.bubbleCloud)
  applyTranscriptionSettings(settings.transcription)
  applyDetailSettings(settings.detail)
  applyRankingSettings(settings.importanceRanking)
  applyHistorySettings(settings.history)
}

export function applyPresentationSnapshot(snapshot: PresentationSnapshot): void {
  usePresentationAppearanceStore.getState().applyAppearance(snapshot.appearance)
  useContentFontScaleStore.getState().setScale(snapshot.contentFontScale)
  useFloatingControlDockUiStore.getState().applyUiState(snapshot.floatingControlDock)
  applyWindowSettingsSnapshot(snapshot.windowSettings)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isLayoutNode = (value: unknown): value is LayoutNode => {
  if (!isRecord(value)) return false
  if (value.type === 'leaf') {
    return typeof value.id === 'string' && typeof value.windowId === 'string'
  }
  if (value.type === 'split') {
    return (
      typeof value.id === 'string' &&
      (value.direction === 'h' || value.direction === 'v') &&
      typeof value.ratio === 'number' &&
      isLayoutNode(value.a) &&
      isLayoutNode(value.b)
    )
  }
  return false
}

const isPresentationSnapshot = (value: unknown): value is PresentationSnapshot => {
  if (!isRecord(value)) return false
  if (value.version !== PRESENTATION_SNAPSHOT_VERSION) return false
  if (typeof value.phaseId !== 'string' || !isLayoutNode(value.layout)) return false
  if (!isRecord(value.appearance)) return false
  if (typeof value.appearance.darkMode !== 'boolean' || typeof value.appearance.themeColor !== 'string') {
    return false
  }
  if (typeof value.contentFontScale !== 'number') return false
  if (!isRecord(value.floatingControlDock) || typeof value.floatingControlDock.scale !== 'number') {
    return false
  }
  const pos = value.floatingControlDock.position
  if (pos !== null && (!isRecord(pos) || typeof pos.x !== 'number' || typeof pos.y !== 'number')) {
    return false
  }
  if (!isRecord(value.windowSettings)) return false
  return true
}

const extractJsonObject = (source: string): string | null => {
  const trimmed = source.trim()
  const snapshotMarker = trimmed.indexOf('PRESENTATION_SNAPSHOT')
  const searchStart = snapshotMarker >= 0 ? trimmed.indexOf('{', snapshotMarker) : trimmed.indexOf('{')
  if (searchStart < 0) return null

  let depth = 0
  let inString: '"' | null = null
  let escaped = false

  for (let i = searchStart; i < trimmed.length; i += 1) {
    const char = trimmed[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === inString) inString = null
      continue
    }
    if (char === '"') {
      inString = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return trimmed.slice(searchStart, i + 1)
    }
  }
  return null
}

export const parsePresentationSnapshotText = (source: string): PresentationSnapshot => {
  const objectText = extractJsonObject(source)
  if (!objectText) {
    throw new Error('プレゼン設定の JSON が見つかりません')
  }

  const parsed: unknown = JSON.parse(objectText)
  if (!isPresentationSnapshot(parsed)) {
    throw new Error('PresentationSnapshot の形式ではありません')
  }
  return parsed
}

export const formatPresentationSnapshotExport = (snapshot: PresentationSnapshot): string =>
  JSON.stringify(snapshot, null, 2)

/** @deprecated formatPresentationSnapshotExport を使用 */
export const formatLayoutTemplateMethod = (phaseId: string, layout: LayoutNode): string =>
  formatPresentationSnapshotExport(capturePresentationSnapshot(phaseId, layout))

/** レイアウトツリーのみ（後方互換） */
export const parseLayoutTemplateText = (source: string): LayoutNode => {
  try {
    return parsePresentationSnapshotText(source).layout
  } catch {
    const objectText = extractJsonObject(source)
    if (!objectText) throw new Error('レイアウト情報のオブジェクトが見つかりません')
    const parsed: unknown = JSON.parse(objectText)
    if (!isLayoutNode(parsed)) throw new Error('LayoutNode の形式ではありません')
    return parsed
  }
}

export function layoutOnlySnapshot(phaseId: string, layout: LayoutNode): PresentationSnapshot {
  return capturePresentationSnapshot(phaseId, layout)
}

const cloneLayout = (layout: LayoutNode): LayoutNode =>
  JSON.parse(JSON.stringify(layout)) as LayoutNode

/** レイアウトツリーと、保存済みスナップショットがあれば関連設定も反映 */
export function applyPresentationLayout(
  phaseId: string,
  layout: LayoutNode,
  snapshot?: PresentationSnapshot,
): void {
  useLayoutStore.getState().setLayout(phaseId, cloneLayout(layout))
  if (snapshot) {
    applyPresentationSnapshot(snapshot)
  }
}
