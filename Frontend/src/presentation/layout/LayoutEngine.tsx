import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GripHorizontal, RefreshCw, Settings, SlidersHorizontal, X } from 'lucide-react'
import type { DropZone, LayoutNode } from '../../domain/entities/Layout'
import { movePanel, updateRatio } from './layoutUtils'
import { getWindowDefinition } from '../windows/registry'
import {
  SYSTEM_CONTROL_WINDOW_ID,
  SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX,
  SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX,
  SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
  SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
} from '../constants/systemControlWindow'
import { getAccentRgb } from '../../theme/accentTokens'
import { useTranscription } from '../hooks/useTranscription'
import { accentRgba } from '../../theme/accentStyles'
import type { TranscriptionMode } from '../../domain/interfaces/ITranscriptionService'
import {
  TRANSCRIPTION_IMPORTANT_FONT_SIZE_MAX,
  TRANSCRIPTION_IMPORTANT_FONT_SIZE_MIN,
  TRANSCRIPTION_MASTER_FONT_SCALE_MAX,
  TRANSCRIPTION_MASTER_FONT_SCALE_MIN,
  TRANSCRIPTION_PLAIN_FONT_SIZE_MAX,
  TRANSCRIPTION_PLAIN_FONT_SIZE_MIN,
  useTranscriptionWindowSettingsStore,
} from '../../stores/transcriptionWindowSettingsStore'
import {
  TERM_MAP_AUTO_SWITCH_INTERVAL_MAX,
  TERM_MAP_AUTO_SWITCH_INTERVAL_MIN,
  TERM_MAP_BUBBLE_SIZE_SCALE_MAX,
  TERM_MAP_BUBBLE_SIZE_SCALE_MIN,
  TERM_MAP_MASTER_SIZE_SCALE_MAX,
  TERM_MAP_MASTER_SIZE_SCALE_MIN,
  TERM_MAP_TEXT_FONT_SIZE_MAX,
  TERM_MAP_TEXT_FONT_SIZE_MIN,
  useTermMapWindowSettingsStore,
} from '../../stores/termMapWindowSettingsStore'
import {
  IMPORTANCE_RANKING_FONT_SIZE_MAX,
  IMPORTANCE_RANKING_FONT_SIZE_MIN,
  IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MAX,
  IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MIN,
  IMPORTANCE_RANKING_VISIBLE_COUNT_MAX,
  IMPORTANCE_RANKING_VISIBLE_COUNT_MIN,
  useImportanceRankingWindowSettingsStore,
} from '../../stores/importanceRankingWindowSettingsStore'

const DropOverlay: React.FC<{ zone: DropZone; rgb: string }> = ({ zone, rgb }) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: `rgba(${rgb},0.20)`,
    border: `2px solid rgba(${rgb},0.75)`,
    borderRadius: 6,
    pointerEvents: 'none',
    zIndex: 50,
    transition: 'all 0.08s ease',
  }
  const pos: Record<DropZone, React.CSSProperties> = {
    left: { top: 4, bottom: 4, left: 4, right: '50%' },
    right: { top: 4, bottom: 4, right: 4, left: '50%' },
    top: { left: 4, right: 4, top: 4, bottom: '50%' },
    bottom: { left: 4, right: 4, bottom: 4, top: '50%' },
  }
  return <div style={{ ...base, ...pos[zone] }} />
}

interface DividerProps {
  direction: 'h' | 'v'
  darkMode: boolean
  accentRgb: string
  onMouseDown: (e: React.MouseEvent) => void
}
const Divider: React.FC<DividerProps> = ({ direction, darkMode, accentRgb, onMouseDown }) => {
  const isH = direction === 'h'
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex-shrink-0 flex items-center justify-center transition-colors select-none ${isH ? 'cursor-col-resize' : 'cursor-row-resize'}`}
      style={{
        width: isH ? 4 : '100%',
        height: isH ? '100%' : 4,
        flexShrink: 0,
        backgroundColor: hovered ? `rgba(${accentRgb},0.5)` : (darkMode ? 'rgba(30,41,59,0.6)' : 'rgba(226,232,240,1)'),
      }}
    >
      <div className={`flex ${isH ? 'flex-col gap-0.5' : 'flex-row gap-0.5'} ${hovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
        {[0, 1, 2].map(i => (
          <div key={i} className={`rounded-full ${isH ? 'w-0.5 h-3' : 'h-0.5 w-3'}`} style={{ backgroundColor: `rgba(${accentRgb},0.9)` }} />
        ))}
      </div>
    </div>
  )
}

interface ResizeState {
  splitId: string
  startPos: number
  startRatio: number
  direction: 'h' | 'v'
  containerSize: number
  minRatio: number
  maxRatio: number
}

const clamp = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value))

const containsSystemControlWindow = (node: LayoutNode): boolean => {
  if (node.type === 'leaf') return node.windowId === SYSTEM_CONTROL_WINDOW_ID
  return containsSystemControlWindow(node.a) || containsSystemControlWindow(node.b)
}

const getSystemControlMinSize = (node: LayoutNode, direction: 'h' | 'v'): number => {
  if (!containsSystemControlWindow(node)) return 0
  return direction === 'h' ? SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX : SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX
}

const systemControlMinStyle = (node: LayoutNode): React.CSSProperties =>
  containsSystemControlWindow(node)
    ? {
        minWidth: SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
        minHeight: SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
      }
    : { minWidth: 0, minHeight: 0 }

interface SettingsSliderProps {
  label: string
  valueLabel: string
  value: number
  min: number
  max: number
  step: number
  darkMode: boolean
  accentRgb: string
  onChange: (value: number) => void
}

const SettingsSlider: React.FC<SettingsSliderProps> = ({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  darkMode,
  accentRgb,
  onChange,
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-[11px] font-bold">{label}</span>
      <span className={`text-[10px] font-mono font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {valueLabel}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full cursor-pointer"
      style={{ accentColor: `rgb(${accentRgb})` }}
      aria-label={label}
    />
  </div>
)

interface WindowSettingsPanelProps {
  windowId: string
  label: string
  darkMode: boolean
  accentRgb: string
  onClose: () => void
}

const WindowSettingsPanel: React.FC<WindowSettingsPanelProps> = ({
  windowId,
  label,
  darkMode,
  accentRgb,
  onClose,
}) => {
  const {
    mode,
    setMode,
    microphones,
    selectedMicrophoneId,
    selectMicrophone,
    refreshMicrophones,
  } = useTranscription()
  const masterFontScale = useTranscriptionWindowSettingsStore(s => s.masterFontScale)
  const plainTextFontSizePx = useTranscriptionWindowSettingsStore(s => s.plainTextFontSizePx)
  const importantTermFontSizePx = useTranscriptionWindowSettingsStore(s => s.importantTermFontSizePx)
  const setMasterFontScale = useTranscriptionWindowSettingsStore(s => s.setMasterFontScale)
  const setPlainTextFontSizePx = useTranscriptionWindowSettingsStore(s => s.setPlainTextFontSizePx)
  const setImportantTermFontSizePx = useTranscriptionWindowSettingsStore(s => s.setImportantTermFontSizePx)
  const termMapMasterSizeScale = useTermMapWindowSettingsStore(s => s.masterSizeScale)
  const termMapBubbleSizeScale = useTermMapWindowSettingsStore(s => s.bubbleSizeScale)
  const termMapTextFontSizePx = useTermMapWindowSettingsStore(s => s.textFontSizePx)
  const termMapAutoSwitchEnabled = useTermMapWindowSettingsStore(s => s.autoSwitchEnabled)
  const termMapAutoSwitchIntervalSec = useTermMapWindowSettingsStore(s => s.autoSwitchIntervalSec)
  const setTermMapMasterSizeScale = useTermMapWindowSettingsStore(s => s.setMasterSizeScale)
  const setTermMapBubbleSizeScale = useTermMapWindowSettingsStore(s => s.setBubbleSizeScale)
  const setTermMapTextFontSizePx = useTermMapWindowSettingsStore(s => s.setTextFontSizePx)
  const setTermMapAutoSwitchEnabled = useTermMapWindowSettingsStore(s => s.setAutoSwitchEnabled)
  const setTermMapAutoSwitchIntervalSec = useTermMapWindowSettingsStore(s => s.setAutoSwitchIntervalSec)
  const importanceRankingMasterSizeScale = useImportanceRankingWindowSettingsStore(s => s.masterSizeScale)
  const importanceRankingFontSizePx = useImportanceRankingWindowSettingsStore(s => s.fontSizePx)
  const importanceRankingVisibleCount = useImportanceRankingWindowSettingsStore(s => s.visibleCount)
  const setImportanceRankingMasterSizeScale = useImportanceRankingWindowSettingsStore(s => s.setMasterSizeScale)
  const setImportanceRankingFontSizePx = useImportanceRankingWindowSettingsStore(s => s.setFontSizePx)
  const setImportanceRankingVisibleCount = useImportanceRankingWindowSettingsStore(s => s.setVisibleCount)
  const dk = darkMode

  const modeButton = (value: TranscriptionMode, text: string) => {
    const active = mode === value
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold transition-colors ${active
          ? ''
          : dk
            ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        style={active
          ? {
              borderColor: `rgba(${accentRgb},0.62)`,
              backgroundColor: `rgba(${accentRgb},${dk ? 0.2 : 0.1})`,
              color: `rgba(${accentRgb},${dk ? 0.96 : 0.88})`,
            }
          : undefined}
      >
        {text}
      </button>
    )
  }

  return (
    <div
      className={`absolute right-2 top-10 z-[70] w-[min(92vw,280px)] rounded-xl border p-3 shadow-2xl ${dk
        ? 'border-slate-700 bg-[#0d0e1a] text-slate-200'
        : 'border-slate-200 bg-white text-slate-800'}`}
      role="dialog"
      aria-label={`${label} の設定`}
      onClick={e => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Settings size={14} style={{ color: accentRgba(accentRgb, dk ? 0.9 : 0.75) }} />
          <p className="min-w-0 truncate text-xs font-black">{label} の設定</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 rounded-md p-1 transition-colors ${dk ? 'text-slate-500 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}
          aria-label="設定を閉じる"
        >
          <X size={14} />
        </button>
      </div>

      {windowId === SYSTEM_CONTROL_WINDOW_ID ? (
        <div className="space-y-3">
          <section>
            <div className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              <SlidersHorizontal size={11} /> 文字起こしモード
            </div>
            <div className="flex gap-2">
              {modeButton('fast', '速度重視')}
              {modeButton('accurate', '品質重視')}
            </div>
            <p className={`mt-1 text-[10px] leading-snug ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              {mode === 'fast' ? 'リアルタイム性を優先します。' : '停止後の高精度化を優先します。'}
            </p>
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                マイク
              </span>
              <button
                type="button"
                onClick={() => refreshMicrophones()}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${dk
                  ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                title="マイク一覧を再取得"
              >
                <RefreshCw size={10} />
                更新
              </button>
            </div>
            <select
              value={selectedMicrophoneId}
              onChange={e => selectMicrophone(e.target.value)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${dk
                ? 'border-slate-700 bg-slate-800 text-slate-200'
                : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {microphones.length === 0 && <option value="">利用可能マイクなし</option>}
              {microphones.map(mic => (
                <option key={mic.deviceId} value={mic.deviceId}>{mic.label}</option>
              ))}
            </select>
          </section>
        </div>
      ) : windowId === 'transcription' ? (
        <div className="space-y-3">
          <section>
            <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              <SlidersHorizontal size={11} /> フォントサイズ
            </div>
            <div className="space-y-2.5">
              <SettingsSlider
                label="マスター"
                valueLabel={`${Math.round(masterFontScale * 100)}%`}
                value={masterFontScale}
                min={TRANSCRIPTION_MASTER_FONT_SCALE_MIN}
                max={TRANSCRIPTION_MASTER_FONT_SCALE_MAX}
                step={0.05}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setMasterFontScale}
              />
              <SettingsSlider
                label="通常文字"
                valueLabel={`${plainTextFontSizePx}px`}
                value={plainTextFontSizePx}
                min={TRANSCRIPTION_PLAIN_FONT_SIZE_MIN}
                max={TRANSCRIPTION_PLAIN_FONT_SIZE_MAX}
                step={1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setPlainTextFontSizePx}
              />
              <SettingsSlider
                label="重要単語"
                valueLabel={`${importantTermFontSizePx}px`}
                value={importantTermFontSizePx}
                min={TRANSCRIPTION_IMPORTANT_FONT_SIZE_MIN}
                max={TRANSCRIPTION_IMPORTANT_FONT_SIZE_MAX}
                step={1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setImportantTermFontSizePx}
              />
            </div>
          </section>
        </div>
      ) : windowId === 'bubbleCloud' ? (
        <div className="space-y-3">
          <section>
            <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              <SlidersHorizontal size={11} /> サイズ
            </div>
            <div className="space-y-2.5">
              <SettingsSlider
                label="マスター"
                valueLabel={`${Math.round(termMapMasterSizeScale * 100)}%`}
                value={termMapMasterSizeScale}
                min={TERM_MAP_MASTER_SIZE_SCALE_MIN}
                max={TERM_MAP_MASTER_SIZE_SCALE_MAX}
                step={0.05}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setTermMapMasterSizeScale}
              />
              <SettingsSlider
                label="バブル"
                valueLabel={`${Math.round(termMapBubbleSizeScale * 100)}%`}
                value={termMapBubbleSizeScale}
                min={TERM_MAP_BUBBLE_SIZE_SCALE_MIN}
                max={TERM_MAP_BUBBLE_SIZE_SCALE_MAX}
                step={0.1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setTermMapBubbleSizeScale}
              />
              <SettingsSlider
                label="テキスト"
                valueLabel={`${termMapTextFontSizePx}px`}
                value={termMapTextFontSizePx}
                min={TERM_MAP_TEXT_FONT_SIZE_MIN}
                max={TERM_MAP_TEXT_FONT_SIZE_MAX}
                step={1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setTermMapTextFontSizePx}
              />
            </div>
          </section>

          <section>
            <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              <RefreshCw size={11} /> 自動切り替え
            </div>
            <button
              type="button"
              onClick={() => setTermMapAutoSwitchEnabled(!termMapAutoSwitchEnabled)}
              className={`mb-2 flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${termMapAutoSwitchEnabled
                ? ''
                : dk
                  ? 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              style={termMapAutoSwitchEnabled
                ? {
                    borderColor: `rgba(${accentRgb},0.62)`,
                    backgroundColor: `rgba(${accentRgb},${dk ? 0.2 : 0.1})`,
                    color: `rgba(${accentRgb},${dk ? 0.96 : 0.88})`,
                  }
                : undefined}
              aria-pressed={termMapAutoSwitchEnabled}
            >
              <span>{termMapAutoSwitchEnabled ? 'ON' : 'OFF'}</span>
              <span className="text-[10px] opacity-80">
                {termMapAutoSwitchEnabled ? '説明と用語を切り替えます' : '手動表示にします'}
              </span>
            </button>
            <SettingsSlider
              label="切り替え間隔"
              valueLabel={`${termMapAutoSwitchIntervalSec}秒`}
              value={termMapAutoSwitchIntervalSec}
              min={TERM_MAP_AUTO_SWITCH_INTERVAL_MIN}
              max={TERM_MAP_AUTO_SWITCH_INTERVAL_MAX}
              step={1}
              darkMode={dk}
              accentRgb={accentRgb}
              onChange={setTermMapAutoSwitchIntervalSec}
            />
          </section>
        </div>
      ) : windowId === 'importanceRanking' ? (
        <div className="space-y-3">
          <section>
            <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              <SlidersHorizontal size={11} /> 表示
            </div>
            <div className="space-y-2.5">
              <SettingsSlider
                label="要素サイズ"
                valueLabel={`${Math.round(importanceRankingMasterSizeScale * 100)}%`}
                value={importanceRankingMasterSizeScale}
                min={IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MIN}
                max={IMPORTANCE_RANKING_MASTER_SIZE_SCALE_MAX}
                step={0.05}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setImportanceRankingMasterSizeScale}
              />
              <SettingsSlider
                label="フォント"
                valueLabel={`${importanceRankingFontSizePx}px`}
                value={importanceRankingFontSizePx}
                min={IMPORTANCE_RANKING_FONT_SIZE_MIN}
                max={IMPORTANCE_RANKING_FONT_SIZE_MAX}
                step={1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setImportanceRankingFontSizePx}
              />
              <SettingsSlider
                label="表示単語数"
                valueLabel={`${importanceRankingVisibleCount}個`}
                value={importanceRankingVisibleCount}
                min={IMPORTANCE_RANKING_VISIBLE_COUNT_MIN}
                max={IMPORTANCE_RANKING_VISIBLE_COUNT_MAX}
                step={1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setImportanceRankingVisibleCount}
              />
            </div>
          </section>
        </div>
      ) : (
        <p className={`text-xs leading-relaxed ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
          このウィンドウ固有の設定は今後追加予定です。
        </p>
      )}
    </div>
  )
}

export interface LayoutEngineProps {
  layout: LayoutNode
  onLayoutChange: (layout: LayoutNode) => void
  darkMode: boolean
  themeColor?: string
  onClose?: (windowId: string) => void
}

export const LayoutEngine: React.FC<LayoutEngineProps> = ({
  layout, onLayoutChange, darkMode, themeColor = 'indigo', onClose,
}) => {
  const accentRgb = getAccentRgb(themeColor)
  const borderStyle = `2px solid rgba(${accentRgb},0.72)`
  const headerBg = `rgba(${accentRgb},${darkMode ? 0.18 : 0.12})`
  const dotColor = `rgba(${accentRgb},1)`
  const panelGlow = darkMode
    ? `0 0 0 1px rgba(${accentRgb},0.14), 0 12px 40px rgba(${accentRgb},0.1)`
    : `0 0 0 1px rgba(${accentRgb},0.18), 0 10px 36px rgba(${accentRgb},0.08)`

  const [dragging, setDragging] = useState<string | null>(null)
  const [dropInfo, setDropInfo] = useState<{ windowId: string; zone: DropZone } | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const [settingsWindowId, setSettingsWindowId] = useState<string | null>(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const delta = resizing.direction === 'h' ? e.clientX - resizing.startPos : e.clientY - resizing.startPos
      const newRatio = resizing.startRatio + delta / resizing.containerSize
      onLayoutChange(updateRatio(layoutRef.current, resizing.splitId, clamp(resizing.minRatio, resizing.maxRatio, newRatio)))
    }
    const onUp = () => setResizing(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizing, onLayoutChange])

  const calcZone = useCallback((e: React.DragEvent, el: HTMLElement): DropZone => {
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const dL = x, dR = r.width - x, dT = y, dB = r.height - y
    const min = Math.min(dL, dR, dT, dB)
    if (min === dL) return 'left'
    if (min === dR) return 'right'
    if (min === dT) return 'top'
    return 'bottom'
  }, [])

  const renderNode = useCallback((node: LayoutNode): React.ReactNode => {
    if (node.type === 'leaf') {
      const def = getWindowDefinition(node.windowId)
      const label = def?.label ?? node.windowId
      const WindowComponent = def?.component
      const closable = def?.closable !== false
      const isTarget = dragging !== null && dragging !== node.windowId && dropInfo?.windowId === node.windowId
      const isSystemControl = node.windowId === SYSTEM_CONTROL_WINDOW_ID
      const leafMin: React.CSSProperties = isSystemControl
        ? {
            minWidth: SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
            minHeight: SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
          }
        : { minWidth: 0, minHeight: 0 }
      return (
        <div
          key={node.id}
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            width: '100%', height: '100%',
            overflow: 'hidden', border: borderStyle, borderRadius: 6,
            boxShadow: panelGlow,
            ...leafMin,
          }}
        >
          <div
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragging(node.windowId) }}
            onDragEnd={() => { setDragging(null); setDropInfo(null) }}
            className={`group flex items-center gap-1.5 px-2.5 py-2 flex-shrink-0 cursor-grab active:cursor-grabbing select-none border-b font-semibold transition-colors ${darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'}`}
            style={{ backgroundColor: headerBg, borderBottomColor: `rgba(${accentRgb},0.42)` }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <GripHorizontal size={14} className="opacity-35 flex-shrink-0 transition-all group-hover:opacity-75 group-hover:scale-110" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                draggable={false}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation()
                  setSettingsWindowId(prev => prev === node.windowId ? null : node.windowId)
                }}
                className={`p-0.5 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 hover:text-white' : 'hover:bg-slate-200 hover:text-black'}`}
                aria-label={`${label} の設定`}
                title={`${label} の設定`}
              >
                <Settings size={12} />
              </button>
            {onClose && closable && (
              <button
                type="button"
                draggable={false}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onClose(node.windowId) }}
                className={`p-0.5 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 hover:text-white' : 'hover:bg-slate-200 hover:text-black'}`}
                aria-label="閉じる"
              >
                <X size={12} />
              </button>
            )}
            </div>
          </div>
          {settingsWindowId === node.windowId && (
            <WindowSettingsPanel
              windowId={node.windowId}
              label={label}
              darkMode={darkMode}
              accentRgb={accentRgb}
              onClose={() => setSettingsWindowId(null)}
            />
          )}
          <div
            style={{
              flex: 1,
              minWidth: isSystemControl ? SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX : 0,
              minHeight: isSystemControl ? SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX : 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="relative z-0 h-full min-h-0 overflow-hidden">
              {WindowComponent
                ? <WindowComponent windowId={node.windowId} darkMode={darkMode} />
                : <div className="p-4 text-sm text-slate-400">ウィンドウ未登録: {node.windowId}</div>
              }
            </div>
            {/* テーマカラーのごく薄い背景ティント（コンテンツ上・操作は透過） */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background: darkMode
                  ? `radial-gradient(115% 90% at 50% -5%, rgba(${accentRgb},0.13) 0%, rgba(${accentRgb},0.045) 38%, transparent 68%)`
                  : `radial-gradient(110% 85% at 50% -5%, rgba(${accentRgb},0.1) 0%, rgba(${accentRgb},0.035) 42%, transparent 70%)`,
              }}
            />
          </div>
          {dragging !== null && dragging !== node.windowId && (
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 40 }}
              onDragOver={e => { e.preventDefault(); setDropInfo({ windowId: node.windowId, zone: calcZone(e, e.currentTarget as HTMLElement) }) }}
              onDrop={e => {
                e.preventDefault()
                if (dragging && dropInfo && dropInfo.windowId === node.windowId) {
                  onLayoutChange(movePanel(layoutRef.current, dragging, node.windowId, dropInfo.zone))
                }
                setDragging(null); setDropInfo(null)
              }}
            >
              {isTarget && dropInfo && <DropOverlay zone={dropInfo.zone} rgb={accentRgb} />}
            </div>
          )}
        </div>
      )
    }

    const isH = node.direction === 'h'
    const aMinStyle = systemControlMinStyle(node.a)
    const bMinStyle = systemControlMinStyle(node.b)
    const aStyle: React.CSSProperties = isH
      ? {
          width: `${node.ratio * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
          ...aMinStyle,
          overflow: 'hidden',
          display: 'flex',
        }
      : {
          height: `${node.ratio * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
          ...aMinStyle,
          overflow: 'hidden',
          display: 'flex',
        }
    const bStyle: React.CSSProperties = {
      flex: 1,
      ...bMinStyle,
      overflow: 'hidden',
      display: 'flex',
    }

    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: isH ? 'row' : 'column', width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
        <div style={aStyle}>{renderNode(node.a)}</div>
        <Divider
          direction={node.direction}
          darkMode={darkMode}
          accentRgb={accentRgb}
          onMouseDown={e => {
            e.preventDefault()
            const parent = (e.currentTarget as HTMLElement).parentElement!
            const rect = parent.getBoundingClientRect()
            const containerSize = (isH ? rect.width : rect.height) - 4
            const minA = getSystemControlMinSize(node.a, node.direction)
            const minB = getSystemControlMinSize(node.b, node.direction)
            const minRatio = containerSize > 0 ? minA / containerSize : 0.1
            const maxRatio = containerSize > 0 ? 1 - minB / containerSize : 0.9
            setResizing({
              splitId: node.id,
              startPos: isH ? e.clientX : e.clientY,
              startRatio: node.ratio,
              direction: node.direction,
              containerSize,
              minRatio: Math.min(0.9, minRatio),
              maxRatio: Math.max(0.1, maxRatio),
            })
          }}
        />
        <div style={bStyle}>{renderNode(node.b)}</div>
      </div>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dropInfo, settingsWindowId, darkMode, accentRgb, borderStyle, headerBg, dotColor, panelGlow, calcZone, onLayoutChange, onClose])

  const rootMinStyle = systemControlMinStyle(layout)

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', ...rootMinStyle }}>
      {renderNode(layout)}
    </div>
  )
}
