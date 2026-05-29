import React from 'react'
import { RefreshCw, Settings, SlidersHorizontal, X } from 'lucide-react'
import { SYSTEM_CONTROL_WINDOW_ID } from '../constants/systemControlWindow'
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
  TERM_MAP_MAX_VISIBLE_TERMS_MAX,
  TERM_MAP_MAX_VISIBLE_TERMS_MIN,
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
import {
  DETAIL_WINDOW_FONT_SIZE_MAX,
  DETAIL_WINDOW_FONT_SIZE_MIN,
  useDetailWindowSettingsStore,
} from '../../stores/detailWindowSettingsStore'
import {
  HISTORY_WINDOW_FONT_SIZE_MAX,
  HISTORY_WINDOW_FONT_SIZE_MIN,
  useHistoryWindowSettingsStore,
} from '../../stores/historyWindowSettingsStore'

const PANEL_CLOSE_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-[filter,background-color] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--app-accent-rgb)/0.45)] focus-visible:ring-offset-1'

/** 層が深いほどぼかしを強くするガラス面（0=パネル殻 … 3=最内層コントロール） */
const glassLayer = (dk: boolean, depth: 0 | 1 | 2 | 3): string => {
  const blur = ['backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md', 'backdrop-blur-lg'][depth]
  if (dk) {
    const bg = ['bg-slate-950/42', 'bg-slate-900/28', 'bg-slate-900/32', 'bg-slate-800/38'][depth]
    const border = ['border-slate-600/45', 'border-slate-600/40', 'border-slate-600/50', 'border-slate-500/55'][depth]
    return `${blur} ${bg} ${border}`
  }
  const bg = ['bg-white/48', 'bg-white/38', 'bg-white/42', 'bg-white/48'][depth]
  const border = ['border-white/50', 'border-slate-200/55', 'border-slate-200/65', 'border-slate-200/70'][depth]
  return `${blur} ${bg} ${border}`
}

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
}) => {
  const dk = darkMode
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${glassLayer(dk, 3)}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold leading-tight">{label}</span>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-mono font-bold tabular-nums backdrop-blur-xl ${dk
            ? 'border-slate-500/50 bg-slate-800/45'
            : 'border-slate-200/70 bg-white/55'}`}
          style={{
            color: accentRgba(accentRgb, dk ? 0.98 : 0.88),
          }}
        >
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
        className={`h-2 w-full cursor-pointer appearance-none rounded-full backdrop-blur-sm ${dk ? 'bg-slate-700/55' : 'bg-slate-200/70'}`}
        style={{ accentColor: `rgb(${accentRgb})` }}
        aria-label={label}
      />
    </div>
  )
}

interface SettingsSectionProps {
  title: string
  icon: React.ReactNode
  darkMode: boolean
  children: React.ReactNode
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon, darkMode, children }) => {
  const dk = darkMode
  return (
    <section className={`rounded-xl border p-3 ${glassLayer(dk, 2)}`}>
      <div className={`mb-3 flex items-center gap-2 text-xs font-bold ${dk ? 'text-slate-300' : 'text-slate-700'}`}>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur-xl ${dk
            ? 'border-slate-500/45 bg-slate-800/40'
            : 'border-slate-200/65 bg-white/50'}`}
          style={{
            color: dk ? 'rgb(203,213,225)' : 'rgb(71,85,105)',
          }}
        >
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  )
}

export interface WindowSettingsPanelProps {
  windowId: string
  label: string
  darkMode: boolean
  accentRgb: string
  onClose: () => void
}

export const WindowSettingsPanel: React.FC<WindowSettingsPanelProps> = ({
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
  const termMapAutoSwitchIntervalSec = useTermMapWindowSettingsStore(s => s.autoSwitchIntervalSec)
  const termMapMaxVisibleTerms = useTermMapWindowSettingsStore(s => s.maxVisibleTerms)
  const setTermMapMasterSizeScale = useTermMapWindowSettingsStore(s => s.setMasterSizeScale)
  const setTermMapBubbleSizeScale = useTermMapWindowSettingsStore(s => s.setBubbleSizeScale)
  const setTermMapTextFontSizePx = useTermMapWindowSettingsStore(s => s.setTextFontSizePx)
  const setTermMapAutoSwitchIntervalSec = useTermMapWindowSettingsStore(s => s.setAutoSwitchIntervalSec)
  const setTermMapMaxVisibleTerms = useTermMapWindowSettingsStore(s => s.setMaxVisibleTerms)
  const importanceRankingMasterSizeScale = useImportanceRankingWindowSettingsStore(s => s.masterSizeScale)
  const importanceRankingFontSizePx = useImportanceRankingWindowSettingsStore(s => s.fontSizePx)
  const importanceRankingVisibleCount = useImportanceRankingWindowSettingsStore(s => s.visibleCount)
  const setImportanceRankingMasterSizeScale = useImportanceRankingWindowSettingsStore(s => s.setMasterSizeScale)
  const setImportanceRankingFontSizePx = useImportanceRankingWindowSettingsStore(s => s.setFontSizePx)
  const setImportanceRankingVisibleCount = useImportanceRankingWindowSettingsStore(s => s.setVisibleCount)
  const detailFontSizePx = useDetailWindowSettingsStore(s => s.fontSizePx)
  const setDetailFontSizePx = useDetailWindowSettingsStore(s => s.setFontSizePx)
  const historyFontSizePx = useHistoryWindowSettingsStore(s => s.fontSizePx)
  const setHistoryFontSizePx = useHistoryWindowSettingsStore(s => s.setFontSizePx)
  const dk = darkMode

  const modeButton = (value: TranscriptionMode, text: string) => {
    const active = mode === value
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-[filter,background-color,box-shadow] hover:brightness-105 ${active
          ? 'backdrop-blur-md'
          : glassLayer(dk, 3)} ${active
          ? ''
          : dk
            ? 'text-slate-400'
            : 'text-slate-500'}`}
        style={active
          ? {
              borderColor: accentRgba(accentRgb, 0.62),
              backgroundColor: accentRgba(accentRgb, dk ? 0.28 : 0.16),
              color: accentRgba(accentRgb, dk ? 0.98 : 0.9),
              boxShadow: `0 0 12px ${accentRgba(accentRgb, dk ? 0.2 : 0.12)}`,
            }
          : undefined}
      >
        {text}
      </button>
    )
  }

  const panelBody = () => {
    if (windowId === SYSTEM_CONTROL_WINDOW_ID) {
      return (
        <div className="space-y-3">
          <SettingsSection title="文字起こしモード" icon={<SlidersHorizontal size={13} />} darkMode={dk}>
            <div className="flex gap-2">
              {modeButton('fast', '速度重視')}
              {modeButton('accurate', '品質重視')}
            </div>
            <p className={`mt-2.5 text-[11px] leading-relaxed ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
              {mode === 'fast' ? 'リアルタイム性を優先します。' : '停止後の高精度化を優先します。'}
            </p>
          </SettingsSection>

          <SettingsSection title="マイク" icon={<RefreshCw size={13} />} darkMode={dk}>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => refreshMicrophones()}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-[filter,background-color] hover:brightness-105 ${glassLayer(dk, 3)} ${dk ? 'text-slate-300' : 'text-slate-600'}`}
                title="マイク一覧を再取得"
              >
                <RefreshCw size={12} />
                一覧を更新
              </button>
            </div>
            <select
              value={selectedMicrophoneId}
              onChange={e => selectMicrophone(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--app-accent-rgb)/0.4)] ${glassLayer(dk, 3)} ${dk ? 'text-slate-100' : 'text-slate-800'}`}
            >
              {microphones.length === 0 && <option value="">利用可能マイクなし</option>}
              {microphones.map(mic => (
                <option key={mic.deviceId} value={mic.deviceId}>{mic.label}</option>
              ))}
            </select>
          </SettingsSection>
        </div>
      )
    }

    if (windowId === 'transcription') {
      return (
        <SettingsSection title="フォントサイズ" icon={<SlidersHorizontal size={13} />} darkMode={dk}>
          <div className="space-y-2">
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
        </SettingsSection>
      )
    }

    if (windowId === 'bubbleCloud') {
      return (
        <div className="space-y-3">
          <SettingsSection title="サイズ" icon={<SlidersHorizontal size={13} />} darkMode={dk}>
            <div className="space-y-2">
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
              <SettingsSlider
                label="最大表示数"
                valueLabel={`${termMapMaxVisibleTerms}語`}
                value={termMapMaxVisibleTerms}
                min={TERM_MAP_MAX_VISIBLE_TERMS_MIN}
                max={TERM_MAP_MAX_VISIBLE_TERMS_MAX}
                step={1}
                darkMode={dk}
                accentRgb={accentRgb}
                onChange={setTermMapMaxVisibleTerms}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="切り替え間隔" icon={<RefreshCw size={13} />} darkMode={dk}>
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
          </SettingsSection>
        </div>
      )
    }

    if (windowId === 'importanceRanking') {
      return (
        <SettingsSection title="表示" icon={<SlidersHorizontal size={13} />} darkMode={dk}>
          <div className="space-y-2">
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
        </SettingsSection>
      )
    }

    if (windowId === 'detail') {
      return (
        <SettingsSection title="フォントサイズ" icon={<SlidersHorizontal size={13} />} darkMode={dk}>
          <SettingsSlider
            label="詳細テキスト"
            valueLabel={`${detailFontSizePx}px`}
            value={detailFontSizePx}
            min={DETAIL_WINDOW_FONT_SIZE_MIN}
            max={DETAIL_WINDOW_FONT_SIZE_MAX}
            step={1}
            darkMode={dk}
            accentRgb={accentRgb}
            onChange={setDetailFontSizePx}
          />
        </SettingsSection>
      )
    }

    if (windowId === 'history') {
      return (
        <SettingsSection title="フォントサイズ" icon={<SlidersHorizontal size={13} />} darkMode={dk}>
          <SettingsSlider
            label="履歴テキスト"
            valueLabel={`${historyFontSizePx}px`}
            value={historyFontSizePx}
            min={HISTORY_WINDOW_FONT_SIZE_MIN}
            max={HISTORY_WINDOW_FONT_SIZE_MAX}
            step={1}
            darkMode={dk}
            accentRgb={accentRgb}
            onChange={setHistoryFontSizePx}
          />
        </SettingsSection>
      )
    }

    return (
      <p
        className={`rounded-xl border px-4 py-6 text-center text-xs leading-relaxed ${glassLayer(dk, 2)} ${dk ? 'text-slate-400' : 'text-slate-500'}`}
      >
        このウィンドウ固有の設定は今後追加予定です。
      </p>
    )
  }

  return (
    <div
      data-window-settings-panel="true"
      className={`absolute top-11 right-2 z-[70] mb-2 flex h-fit max-h-[calc(100%-3.25rem)] w-[min(calc(100%-1rem),20rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl ${glassLayer(dk, 0)} ${dk ? 'text-slate-100' : 'text-slate-900'}`}
      style={{
        boxShadow: dk
          ? `0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px ${accentRgba(accentRgb, 0.18)}, 0 0 28px ${accentRgba(accentRgb, 0.1)}`
          : `0 16px 40px rgba(15,23,42,0.12), 0 0 0 1px ${accentRgba(accentRgb, 0.12)}, 0 0 24px ${accentRgba(accentRgb, 0.06)}`,
      }}
      role="dialog"
      aria-label={`${label} の設定`}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="h-1 shrink-0"
        style={{
          background: `linear-gradient(90deg, ${accentRgba(accentRgb, 0.15)}, ${accentRgba(accentRgb, 0.85)}, ${accentRgba(accentRgb, 0.15)})`,
        }}
        aria-hidden
      />

      <div
        className={`flex shrink-0 items-center justify-between gap-2 border-b px-3.5 py-3 ${glassLayer(dk, 1)}`}
        style={{ backgroundColor: accentRgba(accentRgb, dk ? 0.1 : 0.06) }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border backdrop-blur-md ${dk
              ? 'border-slate-500/50 bg-slate-800/35'
              : 'border-slate-200/60 bg-white/45'}`}
            style={{
              borderColor: accentRgba(accentRgb, dk ? 0.4 : 0.32),
              color: accentRgba(accentRgb, dk ? 0.98 : 0.88),
            }}
          >
            <Settings size={18} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight">{label}</p>
            <p className={`text-[10px] font-medium ${dk ? 'text-slate-400' : 'text-slate-500'}`}>表示の調整</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`${PANEL_CLOSE_BTN} backdrop-blur-lg ${glassLayer(dk, 3)} ${dk ? 'focus-visible:ring-offset-slate-950/42' : 'focus-visible:ring-offset-white/48'}`}
          style={{
            color: dk ? 'rgb(203,213,225)' : 'rgb(100,116,139)',
          }}
          aria-label="設定を閉じる"
          title="閉じる"
        >
          <X size={16} strokeWidth={2.25} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5">
        {panelBody()}
      </div>
    </div>
  )
}
