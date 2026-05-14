import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Mic, Square } from 'lucide-react'
import type { MicrophoneDevice, TranscriptionMode } from '../../domain/interfaces/ITranscriptionService'
import { useAccentTheme } from '../../theme/AccentThemeContext'
import { micStartButtonStyle } from '../../theme/accentStyles'

export type RecordingToolbarProps = {
  darkMode?: boolean
  isListening: boolean
  onToggleListening: () => void
  mode: TranscriptionMode
  onChangeMode: (mode: TranscriptionMode) => void
  microphones: MicrophoneDevice[]
  selectedMicrophoneId: string
  onSelectMicrophone: (deviceId: string) => void
  onRefreshMicrophones: () => void
  /** systemControl 内ではコンパクトに */
  compact?: boolean
  /** 旧 App 等: 録音ボタンのみ / 操作ドック詳細: モード・マイクのみ */
  variant?: 'full' | 'recordOnly' | 'controlsOnly'
}

export const RecordingToolbar: React.FC<RecordingToolbarProps> = ({
  darkMode = true,
  isListening,
  onToggleListening,
  mode,
  onChangeMode,
  microphones,
  selectedMicrophoneId,
  onSelectMicrophone,
  onRefreshMicrophones,
  compact = false,
  variant = 'full',
}) => {
  const dk = darkMode
  const { rgb } = useAccentTheme()
  const btnSize = compact ? 'w-14 h-14' : 'w-20 h-20'
  const iconMic = compact ? 24 : 32
  const iconSq = compact ? 20 : 26
  const showModeAndMic = variant === 'full' || variant === 'controlsOnly'
  const showRecordButton = variant !== 'controlsOnly'

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      {showRecordButton ? (
        <>
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.button
                key="stop"
                onClick={onToggleListening}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                whileTap={{ scale: 0.92 }}
                className={`${btnSize} rounded-full flex items-center justify-center relative shadow-2xl bg-red-500 hover:bg-red-400 text-white shadow-red-500/30`}
                title="録音を中断"
              >
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25 pointer-events-none" />
                <Square size={iconSq} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                key="start"
                onClick={onToggleListening}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                whileTap={{ scale: 0.92 }}
                className={`${btnSize} rounded-full flex items-center justify-center shadow-2xl transition-[filter] hover:brightness-110`}
                style={micStartButtonStyle(rgb, dk)}
                title="録音開始"
              >
                <Mic size={iconMic} />
              </motion.button>
            )}
          </AnimatePresence>
          <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
            {isListening ? '中断' : '録音開始'}
          </span>
        </>
      ) : null}
      {showModeAndMic ? (
        <div className={`${showRecordButton ? 'mt-3' : 'mt-0'} flex w-full flex-col gap-2`}>
          {/* Mode selector */}
          <div className="flex flex-col gap-0.5">
            <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>モード</span>
            <select
              value={mode}
              onChange={(e) => onChangeMode(e.target.value as TranscriptionMode)}
              className={`w-full rounded-md border px-2 py-1 text-[11px] ${
                dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
              }`}
              title="文字起こしモードを選択"
            >
              <option value="fast">速度重視</option>
              <option value="accurate">正確さ重視</option>
            </select>
            <span className={`text-[9px] px-0.5 ${dk ? 'text-slate-600' : 'text-slate-400'}`}>
              {mode === 'fast' ? 'WebSpeechでリアルタイム寄り' : '停止後にローカルSTTで高精度化'}
            </span>
          </div>

          {/* Microphone selector */}
          <div className="flex flex-col gap-0.5">
            <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>マイク</span>
            <div className="flex gap-1">
              <select
                value={selectedMicrophoneId}
                onChange={(e) => onSelectMicrophone(e.target.value)}
                className={`min-w-0 flex-1 rounded-md border px-2 py-1 text-[11px] ${
                  dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                }`}
                title="使用するマイクを選択"
              >
                {microphones.length === 0 && <option value="">利用可能マイクなし</option>}
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onRefreshMicrophones}
                className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${
                  dk
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
                title="マイク一覧を再取得"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
