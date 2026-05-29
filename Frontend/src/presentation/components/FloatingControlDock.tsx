import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, GripVertical, Mic, Pause, Play, RotateCcw } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useTranscription } from '../hooks/useTranscription'
import { usePresentationShell } from '../context/PresentationShellContext'
import { useAccentTheme } from '../../theme/AccentThemeContext'
import { accentRgba } from '../../theme/accentStyles'

interface Props {
  darkMode?: boolean
}

/** 画面端からの最小マージン（px） */
const EDGE_MARGIN = 16
/** サイズ倍率の範囲とドラッグ感度 */
const MIN_SCALE = 0.8
const MAX_SCALE = 1.8
const RESIZE_BASE = 200

type Position = { x: number; y: number }

const clampScale = (v: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v))

/**
 * 録音操作とリセットをまとめた、画面上を自由に移動できるフロート操作 UI。
 * 旧「操作（リモコン）ウィンドウ」を置き換える。
 * 他ウィンドウ同様、アクセントカラーの枠を持ち、ドラッグでサイズを変更できる。
 */
export const FloatingControlDock: React.FC<Props> = ({ darkMode = true }) => {
  const dk = darkMode
  const { rgb } = useAccentTheme()
  const { onResetAll } = usePresentationShell()
  const { isListening, isPaused, startListening, pauseListening } = useTranscription()

  const dockRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const resizeRef = useRef<{ pointerId: number; startX: number; startY: number; startScale: number } | null>(null)
  const [pos, setPos] = useState<Position | null>(null)
  const [scale, setScale] = useState(1)
  const [busy, setBusy] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const clampToViewport = useCallback((x: number, y: number): Position => {
    const rect = dockRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 0
    const h = rect?.height ?? 0
    const maxX = Math.max(EDGE_MARGIN, window.innerWidth - w - EDGE_MARGIN)
    const maxY = Math.max(EDGE_MARGIN, window.innerHeight - h - EDGE_MARGIN)
    return {
      x: Math.min(Math.max(EDGE_MARGIN, x), maxX),
      y: Math.min(Math.max(EDGE_MARGIN, y), maxY),
    }
  }, [])

  // 初期位置: 画面下部中央
  useLayoutEffect(() => {
    if (pos) return
    const rect = dockRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({
      x: Math.max(EDGE_MARGIN, (window.innerWidth - rect.width) / 2),
      y: Math.max(EDGE_MARGIN, window.innerHeight - rect.height - EDGE_MARGIN * 2),
    })
  }, [pos])

  // サイズ変更・ウィンドウリサイズで画面外に出ないよう補正
  useEffect(() => {
    setPos((p) => (p ? clampToViewport(p.x, p.y) : p))
  }, [scale, clampToViewport])

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampToViewport(p.x, p.y) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampToViewport])

  // --- ドラッグ移動 ---
  const onDragPointerDown = (e: React.PointerEvent) => {
    const rect = dockRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { pointerId: e.pointerId, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
    setBusy(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDragPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    setPos(clampToViewport(e.clientX - drag.offsetX, e.clientY - drag.offsetY))
  }
  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId !== e.pointerId) return
    dragRef.current = null
    setBusy(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  // --- サイズ変更（拡大縮小） ---
  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    resizeRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startScale: scale }
    setBusy(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current
    if (!r || r.pointerId !== e.pointerId) return
    const delta = (e.clientX - r.startX + (e.clientY - r.startY)) / 2
    setScale(clampScale(r.startScale + delta / RESIZE_BASE))
  }
  const endResize = (e: React.PointerEvent) => {
    if (resizeRef.current?.pointerId !== e.pointerId) return
    resizeRef.current = null
    setBusy(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const recordButton = isListening ? (
    <motion.button
      key="pause"
      type="button"
      onClick={pauseListening}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.14 }}
      whileTap={{ scale: 0.93 }}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-110 ${focusRing} focus-visible:ring-amber-400/70 ${ringOffset}`}
      style={{
        background: 'radial-gradient(120% 120% at 50% 20%, #fcd34d, #d97706)',
        boxShadow: '0 6px 22px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
      }}
      title="録音を一時停止"
      aria-label="録音を一時停止"
    >
      <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-amber-300 opacity-20" />
      <Pause size={24} fill="currentColor" className="shrink-0" />
    </motion.button>
  ) : (
    <motion.button
      key={isPaused ? 'resume' : 'start'}
      type="button"
      onClick={startListening}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.14 }}
      whileTap={{ scale: 0.93 }}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-110 ${focusRing} focus-visible:ring-emerald-400/70 ${ringOffset}`}
      style={{
        background: 'radial-gradient(120% 120% at 50% 20%, #6ee7b7, #059669)',
        boxShadow: '0 6px 22px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
      }}
      title={isPaused ? '録音を再開' : '録音開始'}
      aria-label={isPaused ? '録音を再開' : '録音開始'}
    >
      {isPaused ? <Play size={24} fill="currentColor" className="ml-0.5 shrink-0" /> : <Mic size={24} strokeWidth={2.25} className="shrink-0" />}
    </motion.button>
  )

  return (
    <div
      ref={dockRef}
      role="group"
      aria-label="録音操作"
      className="fixed z-[60] select-none"
      style={{
        left: pos?.x ?? -9999,
        top: pos?.y ?? -9999,
        opacity: pos ? 1 : 0,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        transition: busy ? 'none' : 'opacity 0.2s ease',
        touchAction: 'none',
      }}
    >
      <div
        className={`relative flex items-center gap-1.5 rounded-full border-2 p-1.5 pr-2 backdrop-blur-md ${
          dk ? 'bg-slate-900/80' : 'bg-white/85'
        }`}
        style={{
          borderColor: accentRgba(rgb, dk ? 0.72 : 0.66),
          boxShadow: dk
            ? `0 12px 36px rgba(2,6,23,0.55), 0 0 22px ${accentRgba(rgb, 0.22)}`
            : `0 12px 30px rgba(15,23,42,0.16), 0 0 18px ${accentRgba(rgb, 0.18)}`,
        }}
      >
        {/* ドラッグハンドル */}
        <button
          type="button"
          aria-label="操作パネルを移動"
          title="ドラッグで移動"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`flex h-14 w-6 shrink-0 cursor-grab items-center justify-center rounded-full transition-colors active:cursor-grabbing ${
            dk ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300' : 'text-slate-400 hover:bg-black/5 hover:text-slate-600'
          }`}
        >
          <GripVertical size={16} />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          {recordButton}
        </AnimatePresence>

        {/* リセット（確認ダイアログ付き） */}
        <AlertDialog.Root open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialog.Trigger asChild>
            <button
              type="button"
              title="文字起こし・用語・履歴などをすべてクリアします"
              aria-label="すべてリセット"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors ${focusRing} focus-visible:ring-rose-400/60 ${ringOffset} ${
                dk
                  ? 'border-slate-600/60 bg-slate-800/70 text-slate-400 hover:border-rose-500/55 hover:bg-rose-500/12 hover:text-rose-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <RotateCcw size={20} strokeWidth={2.4} />
            </button>
          </AlertDialog.Trigger>

          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
            <AlertDialog.Content
              className={`fixed left-1/2 top-1/2 z-[101] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${
                dk ? 'border-slate-700 bg-[#0d0e1a] text-slate-100' : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${dk ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                  <AlertTriangle size={18} strokeWidth={2} />
                </span>
                <AlertDialog.Title className="text-sm font-bold">本当にリセットしますか？</AlertDialog.Title>
              </div>
              <AlertDialog.Description className={`text-xs leading-relaxed ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                文字起こし・用語・バブル・履歴がすべて消去されます。この操作は元に戻せません。
              </AlertDialog.Description>
              <div className="mt-4 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <button
                    className={`rounded-md border px-4 py-1.5 text-xs font-bold transition-colors ${
                      dk ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
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

        {/* サイズ変更ハンドル（右下） */}
        <button
          type="button"
          aria-label="サイズを変更"
          title="ドラッグでサイズ変更"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border shadow-sm transition-colors ${
            dk ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
          }`}
          style={{ borderColor: accentRgba(rgb, dk ? 0.6 : 0.5) }}
        >
          <span
            className="block h-2.5 w-2.5"
            style={{
              background: `repeating-linear-gradient(135deg, ${accentRgba(rgb, dk ? 0.95 : 0.8)} 0, ${accentRgba(rgb, dk ? 0.95 : 0.8)} 1px, transparent 1.5px, transparent 3px)`,
            }}
          />
        </button>
      </div>
    </div>
  )
}
