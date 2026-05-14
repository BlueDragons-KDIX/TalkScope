import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Pause, Play, RotateCcw, AlertTriangle } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { PhaseTransitionButton } from '../../components/PhaseTransitionButton'
import { usePresentationShell } from '../../context/PresentationShellContext'
import { useTranscription } from '../../hooks/useTranscription'
import type { WindowProps } from '../IWindowDefinition'
import {
  SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
  SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
} from '../../constants/systemControlWindow'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

export const SystemControlWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { onResetAll } = usePresentationShell()
  const dk = darkMode
  const [resetOpen, setResetOpen] = useState(false)

  const { isListening, isPaused, startListening, pauseListening } = useTranscription()

  const ringOffsetCls = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'
  const divider = dk ? 'bg-slate-700/40' : 'bg-slate-200'

  const primaryBtnBase =
    'relative flex h-12 min-h-12 w-full flex-row items-center justify-center gap-2 rounded-lg text-xs font-bold shadow-md transition-transform active:scale-[0.98]'

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
      {/* 録音コントロール（最優先） */}
      <section aria-label="録音コントロール" className="flex flex-col gap-1.5">
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.button
              key="pause"
              onClick={pauseListening}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              whileTap={{ scale: 0.98 }}
              className={`${primaryBtnBase} bg-amber-500 text-white shadow-amber-900/30 hover:bg-amber-400 ${focusRing} focus-visible:ring-amber-400/60 ${ringOffsetCls}`}
              title="録音を一時停止"
            >
              <span className="pointer-events-none absolute inset-0 animate-ping rounded-lg bg-amber-400 opacity-15" />
              <Pause size={16} fill="currentColor" className="shrink-0" />
              <span className="min-w-0 truncate">一時停止</span>
            </motion.button>
          ) : isPaused ? (
            <motion.button
              key="resume"
              onClick={startListening}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              whileTap={{ scale: 0.98 }}
              className={`${primaryBtnBase} bg-emerald-600 text-white shadow-emerald-900/30 hover:bg-emerald-500 ${focusRing} focus-visible:ring-emerald-400/60 ${ringOffsetCls}`}
              title="録音を再開"
            >
              <Play size={16} fill="currentColor" className="shrink-0" />
              <span className="min-w-0 truncate">再開</span>
            </motion.button>
          ) : (
            <motion.button
              key="start"
              onClick={startListening}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              whileTap={{ scale: 0.98 }}
              className={`${primaryBtnBase} bg-emerald-500 text-white shadow-emerald-900/30 hover:bg-emerald-400 ${focusRing} focus-visible:ring-emerald-400/60 ${ringOffsetCls}`}
              title="録音開始"
            >
              <Mic size={16} strokeWidth={2.25} className="shrink-0" />
              <span className="min-w-0 truncate">録音</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 発表終了（録音コントロールより視覚的に従属） */}
        <PhaseTransitionButton darkMode={darkMode} compact />
      </section>

      <div className={`h-px shrink-0 ${divider}`} role="presentation" />

      {/* リセット（確認ダイアログ付き） */}
      <AlertDialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialog.Trigger asChild>
          <button
            type="button"
            title="文字起こし・用語・履歴などをすべてクリアします"
            className={`flex w-full min-w-0 flex-row items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-colors ${focusRing} focus-visible:ring-amber-400/60 ${ringOffsetCls} ${
              dk
                ? 'border-amber-500/40 bg-amber-500/12 text-amber-300 hover:bg-amber-500/22'
                : 'border-amber-300/90 bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
            aria-label="すべてリセット"
          >
            <RotateCcw size={14} strokeWidth={2.5} className="shrink-0" />
            リセット
          </button>
        </AlertDialog.Trigger>

        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <AlertDialog.Content
            className={`fixed left-1/2 top-1/2 z-[101] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${
              dk
                ? 'border-slate-700 bg-[#0d0e1a] text-slate-100'
                : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dk ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={18} strokeWidth={2} />
              </span>
              <AlertDialog.Title className="text-sm font-bold">
                本当にリセットしますか？
              </AlertDialog.Title>
            </div>
            <AlertDialog.Description className={`text-xs leading-relaxed ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
              文字起こし・用語・バブル・履歴がすべて消去されます。この操作は元に戻せません。
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className={`rounded-md border px-4 py-1.5 text-xs font-bold transition-colors ${
                    dk
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  キャンセル
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={onResetAll}
                  className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-500"
                >
                  リセットする
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
