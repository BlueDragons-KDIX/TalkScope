import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Square, RotateCcw, Settings, RefreshCw } from 'lucide-react'
import { LayoutPresetMenu } from '../../components/LayoutPresetMenu'
import { TestFeaturesPopover } from '../../components/TestFeaturesPopover'
import { PhaseTransitionButton } from '../../components/PhaseTransitionButton'
import { usePresentationShell } from '../../context/PresentationShellContext'
import { useTranscription } from '../../hooks/useTranscription'
import { usePhaseStore } from '../../../stores/phaseStore'
import type { WindowProps } from '../IWindowDefinition'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2'

export const SystemControlWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { onOpenAppearance, onResetAll } = usePresentationShell()
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const isDuring = currentPhaseId === 'during'
  const dk = darkMode
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const { isListening, startListening, stopListening } = useTranscription()

  const handleToggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const divider = dk ? 'bg-slate-700/40' : 'bg-slate-200'
  const tertiaryGhost = dk
    ? 'text-slate-400 hover:bg-slate-800/90 hover:text-slate-100'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'

  const recordBtnBase =
    'relative flex min-h-10 h-10 min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold shadow-md'

  return (
    <div
      className={`flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto p-2 ${
        dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-800'
      }`}
    >
      <section aria-label="録音と発表の切り替え" className="flex gap-1.5">
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
              className={`${recordBtnBase} bg-red-500 text-white shadow-red-500/25 hover:bg-red-400`}
              title="録音を中断"
            >
              <span className="pointer-events-none absolute inset-0 animate-ping rounded-lg bg-red-400 opacity-15" />
              <Square size={14} fill="currentColor" className="shrink-0" />
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
              className={`${recordBtnBase} ${
                dk
                  ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500'
                  : 'bg-indigo-600 text-white shadow-indigo-600/25 hover:bg-indigo-500'
              }`}
              title="録音開始"
            >
              <Mic size={14} strokeWidth={2.25} className="shrink-0" />
              <span className="min-w-0 truncate">録音</span>
            </motion.button>
          )}
        </AnimatePresence>

        <PhaseTransitionButton darkMode={darkMode} compact />
      </section>

      <div className={`h-px shrink-0 ${divider}`} role="presentation" />

      <div className="flex min-w-0 items-center justify-between gap-2" aria-label="リセットとツール">
        <button
          type="button"
          onClick={onResetAll}
          title="文字起こし・用語・履歴などをすべてクリアします"
          className={`flex shrink-0 flex-row items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
            dk
              ? 'border-amber-500/40 bg-amber-500/12 text-amber-300 hover:bg-amber-500/22'
              : 'border-amber-300/90 bg-amber-50 text-amber-900 hover:bg-amber-100'
          } ${focusRing} ${ringOffset}`}
          aria-label="すべてリセット"
        >
          <RotateCcw size={13} strokeWidth={2.5} className="shrink-0" />
          リセット
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <LayoutPresetMenu darkMode={darkMode} phaseId="during" menuAlign="right" disabled={!isDuring} compact />
          <button
            type="button"
            onClick={onOpenAppearance}
            title="設定（表示・文字起こし・マイクなど）"
            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${tertiaryGhost}`}
            aria-haspopup="dialog"
            aria-label="設定を開く"
          >
            <Settings size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="アプリを再読み込み"
            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${tertiaryGhost}`}
            aria-label="アプリを再読み込み"
          >
            <RefreshCw size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {import.meta.env.DEV ? (
        <div className={`mt-auto border-t pt-1.5 ${dk ? 'border-slate-700/35' : 'border-slate-200'}`}>
          <TestFeaturesPopover darkMode={darkMode} align="left" />
        </div>
      ) : null}
    </div>
  )
}
