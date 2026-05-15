import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, Pause, Play, RotateCcw, AlertTriangle } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { PhaseTransitionButton } from '../../components/PhaseTransitionButton'
import { usePresentationShell } from '../../context/PresentationShellContext'
import { useTranscription } from '../../hooks/useTranscription'
import type { WindowProps } from '../IWindowDefinition'
import {
  SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX,
  SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX,
} from '../../constants/systemControlWindow'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

type ControlsLayoutMode = 'wide' | 'tall' | 'middle' | 'tiny'

const clamp = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value))

export const SystemControlWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { onResetAll } = usePresentationShell()
  const dk = darkMode
  const [resetOpen, setResetOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [layoutMode, setLayoutMode] = useState<ControlsLayoutMode>('tall')
  const [viewportSize, setViewportSize] = useState({ width: SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX, height: SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX })

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
      const width = entry?.contentRect?.width ?? SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX
      const height = entry?.contentRect?.height ?? SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX
      setViewportSize({ width, height })

      const ratio = width / Math.max(height, 1)
      const isTiny = width < 168 || height < 172
      if (isTiny) setLayoutMode('tiny')
      else if (ratio >= 1.45) setLayoutMode('wide')
      else if (ratio <= 0.76) setLayoutMode('tall')
      else setLayoutMode('middle')
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isTiny = layoutMode === 'tiny'

  const controlsLayoutStyle = useMemo<React.CSSProperties>(() => {
    if (isTiny) {
      return {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateAreas: '"record" "phase" "reset"',
        gap: 6,
        alignItems: 'stretch',
      }
    }

    if (layoutMode === 'wide') {
      return {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(72px, 0.68fr)',
        gridTemplateAreas: '"record phase reset"',
        gap: 8,
        alignItems: 'center',
      }
    }

    if (layoutMode === 'tall') {
      return {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateAreas: '"record" "phase" "reset"',
        gap: 8,
        alignItems: 'stretch',
      }
    }

    return {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      gridTemplateAreas: '"record phase" ". reset"',
      columnGap: 8,
      rowGap: 10,
      alignItems: 'stretch',
    }
  }, [isTiny, layoutMode])

  const baseControlSize = useMemo(() => {
    const { width, height } = viewportSize
    const contentWidth = Math.max(0, width - 20)
    const contentHeight = Math.max(0, height - 20)

    if (isTiny) {
      return clamp(42, 56, Math.min(contentWidth, Math.floor((contentHeight - 16) / 2.75)))
    }

    if (layoutMode === 'wide') {
      return clamp(48, 76, Math.min(Math.floor((contentWidth - 16) / 2.68), contentHeight))
    }
    if (layoutMode === 'tall') {
      return clamp(48, 78, Math.min(contentWidth, Math.floor((contentHeight - 24) / 2.72)))
    }
    return clamp(46, 74, Math.min(Math.floor((contentWidth - 8) / 2), Math.floor((contentHeight - 14) / 1.88)))
  }, [isTiny, layoutMode, viewportSize])

  const primaryTileStyle = { minHeight: baseControlSize, height: baseControlSize }
  const resetTileStyle = {
    gridArea: 'reset',
    justifySelf: layoutMode === 'middle' ? 'end' : 'stretch',
    marginTop: layoutMode === 'tall' ? 8 : 0,
    minHeight: Math.round(baseControlSize * 0.84),
    height: Math.round(baseControlSize * 0.84),
    width: layoutMode === 'middle' ? 'min(100%, 124px)' : '100%',
  } satisfies React.CSSProperties

  return (
    <div
      ref={rootRef}
      style={{
        minWidth: SYSTEM_CONTROL_CONTENT_MIN_WIDTH_PX,
        minHeight: SYSTEM_CONTROL_CONTENT_MIN_HEIGHT_PX,
      }}
      className={`box-border flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2.5 ${
        dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-800'
      }`}
    >
      <section aria-label="操作コントロール" style={controlsLayoutStyle}>
        <div style={{ ...primaryTileStyle, gridArea: 'record' }}>
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

        <div style={{ ...primaryTileStyle, gridArea: 'phase' }}>
          <PhaseTransitionButton
            darkMode={darkMode}
            compact
            compactClassName="h-full px-2.5 text-xs"
          />
        </div>

      {/* リセット（確認ダイアログ付き） */}
        <AlertDialog.Root open={resetOpen} onOpenChange={setResetOpen}>
          <div style={resetTileStyle}>
            <AlertDialog.Trigger asChild>
              <button
                type="button"
                title="文字起こし・用語・履歴などをすべてクリアします"
                className={`${resetBtnBase} ${focusRing} focus-visible:ring-amber-400/60 ${ringOffsetCls} ${
                  dk
                    ? 'border-slate-600/55 bg-gradient-to-b from-slate-800/70 to-slate-900/70 text-slate-400 hover:border-amber-500/55 hover:text-amber-300 hover:from-amber-500/14 hover:to-amber-600/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-500 hover:border-amber-300 hover:text-amber-800 hover:from-amber-50 hover:to-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)]'
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
