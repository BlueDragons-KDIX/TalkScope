import React, { useEffect, useMemo, useRef, useState } from 'react'
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

type ControlsLayoutMode = 'row' | 'column' | 'mid'

export const SystemControlWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { onResetAll } = usePresentationShell()
  const dk = darkMode
  const [resetOpen, setResetOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [layoutMode, setLayoutMode] = useState<ControlsLayoutMode>('column')
  const [viewportSize, setViewportSize] = useState({ width: SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX, height: SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX })

  const { isListening, isPaused, startListening, pauseListening } = useTranscription()

  const ringOffsetCls = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const primaryBtnBase =
    'relative flex h-full w-full min-w-0 flex-row items-center justify-center gap-2 rounded-full px-2.5 text-xs font-bold transition-transform active:scale-[0.98]'
  const resetBtnBase = 'flex h-full w-full min-w-0 flex-row items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors'

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const width = entry?.contentRect?.width ?? SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX
      const height = entry?.contentRect?.height ?? SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX
      setViewportSize({ width, height })

      const ratio = width / Math.max(height, 1)
      if (ratio >= 1.34) setLayoutMode('row')
      else if (ratio <= 0.78) setLayoutMode('column')
      else setLayoutMode('mid')
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const controlsLayoutClass = useMemo(() => {
    if (layoutMode === 'row') return 'grid grid-cols-3 items-stretch gap-2'
    if (layoutMode === 'column') return 'grid grid-cols-1 items-stretch gap-2'
    return 'grid grid-cols-2 items-stretch gap-2'
  }, [layoutMode])

  const baseControlSize = useMemo(() => {
    const { width, height } = viewportSize
    if (layoutMode === 'row') {
      return Math.max(54, Math.min(92, Math.floor((width - 32) / 3)))
    }
    if (layoutMode === 'column') {
      return Math.max(54, Math.min(92, Math.floor((height - 52) / 3)))
    }
    const fromWidth = Math.floor((width - 24) / 2)
    const fromHeight = Math.floor((height - 56) / 2)
    return Math.max(52, Math.min(88, Math.min(fromWidth, fromHeight)))
  }, [layoutMode, viewportSize])

  const primaryTileStyle = { minHeight: baseControlSize, height: baseControlSize }
  const resetTileStyle = { minHeight: Math.round(baseControlSize * 0.88), height: Math.round(baseControlSize * 0.88) }

  return (
    <div
      ref={rootRef}
      style={{
        minWidth: SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
        minHeight: SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
      }}
      className={`box-border flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2.5 ${
        dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-800'
      }`}
    >
      <section aria-label="操作コントロール" className={controlsLayoutClass}>
        <div style={primaryTileStyle}>
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
                className={`${primaryBtnBase} bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-[0_2px_14px_rgba(245,158,11,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[1.08] ${focusRing} focus-visible:ring-amber-400/70 ${ringOffsetCls}`}
                title="録音を一時停止"
              >
                <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-amber-300 opacity-10" />
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
                className={`${primaryBtnBase} bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_2px_14px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[1.08] ${focusRing} focus-visible:ring-emerald-400/70 ${ringOffsetCls}`}
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
                className={`${primaryBtnBase} bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_2px_14px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[1.08] ${focusRing} focus-visible:ring-emerald-400/70 ${ringOffsetCls}`}
                title="録音開始"
              >
                <Mic size={16} strokeWidth={2.25} className="shrink-0" />
                <span className="min-w-0 truncate">録音</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div style={primaryTileStyle}>
          <PhaseTransitionButton
            darkMode={darkMode}
            compact
            compactClassName="h-full px-2.5 text-xs"
          />
        </div>

      {/* リセット（確認ダイアログ付き） */}
        <AlertDialog.Root open={resetOpen} onOpenChange={setResetOpen}>
          <div className={layoutMode === 'mid' ? 'col-span-2' : ''} style={resetTileStyle}>
            <AlertDialog.Trigger asChild>
              <button
                type="button"
                title="文字起こし・用語・履歴などをすべてクリアします"
                className={`${resetBtnBase} ${focusRing} focus-visible:ring-amber-400/60 ${ringOffsetCls} ${
                  dk
                    ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/15 to-amber-600/8 text-amber-300 hover:from-amber-500/25 hover:to-amber-600/15 shadow-[inset_0_1px_0_rgba(251,191,36,0.12),0_1px_4px_rgba(0,0,0,0.25)]'
                    : 'border-amber-300 bg-gradient-to-b from-white to-amber-50 text-amber-800 hover:from-amber-50 hover:to-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(160,100,0,0.12)]'
                }`}
                aria-label="すべてリセット"
              >
                <RotateCcw size={14} strokeWidth={2.5} className="shrink-0" />
                <span className="min-w-0 truncate">リセット</span>
              </button>
            </AlertDialog.Trigger>
          </div>

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
      </section>
    </div>
  )
}
