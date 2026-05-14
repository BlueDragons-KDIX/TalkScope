import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Square, RotateCcw } from 'lucide-react'
import { PhaseTransitionButton } from '../../components/PhaseTransitionButton'
import { usePresentationShell } from '../../context/PresentationShellContext'
import { useTranscription } from '../../hooks/useTranscription'
import type { WindowProps } from '../IWindowDefinition'
import {
  SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
  SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
} from '../../constants/systemControlWindow'
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--app-accent-rgb)/0.45)] focus-visible:ring-offset-2'

export const SystemControlWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { onResetAll } = usePresentationShell()
  const dk = darkMode
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const { isListening, startListening, stopListening } = useTranscription()

  const handleToggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const divider = dk ? 'bg-slate-700/40' : 'bg-slate-200'

  const recordBtnBase =
    'relative flex min-h-11 h-11 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-lg px-2.5 text-[11px] font-bold shadow-md'

  return (
    <div
      style={{
        minWidth: SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
        minHeight: SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
      }}
      className={`box-border flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2.5 ${
        dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-800'
      }`}
    >
      <section aria-label="録音と発表の切り替え" className="flex gap-2">
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.button
              key="stop"
              onClick={handleToggleListening}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              whileTap={{ scale: 0.98 }}
              className={`${recordBtnBase} bg-emerald-500 text-white shadow-emerald-500/25 hover:bg-emerald-400`}
              title="録音を中断"
            >
              <span className="pointer-events-none absolute inset-0 animate-ping rounded-lg bg-emerald-400 opacity-15" />
              <Square size={16} fill="currentColor" className="shrink-0" />
              <span className="min-w-0 truncate">中断</span>
            </motion.button>
          ) : (
            <motion.button
              key="start"
              onClick={handleToggleListening}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              whileTap={{ scale: 0.98 }}
              className={`${recordBtnBase} bg-violet-600 text-white shadow-violet-500/25 hover:bg-violet-500`}
              title="録音開始"
            >
              <Mic size={16} strokeWidth={2.25} className="shrink-0" />
              <span className="min-w-0 truncate">録音</span>
            </motion.button>
          )}
        </AnimatePresence>

        <PhaseTransitionButton darkMode={darkMode} compact />
      </section>

      <div className={`h-px shrink-0 ${divider}`} role="presentation" />

      <button
        type="button"
        onClick={onResetAll}
        title="文字起こし・用語・履歴などをすべてクリアします"
        className={`flex w-full min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-colors ${
          dk
            ? 'border-amber-500/40 bg-amber-500/12 text-amber-300 hover:bg-amber-500/22'
            : 'border-amber-300/90 bg-amber-50 text-amber-900 hover:bg-amber-100'
        } ${focusRing} ${ringOffset}`}
        aria-label="すべてリセット"
      >
        <RotateCcw size={15} strokeWidth={2.5} className="shrink-0" />
        リセット
      </button>
    </div>
  )
}
