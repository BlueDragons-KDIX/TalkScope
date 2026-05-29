import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Mic, Pause, Play, RotateCcw } from 'lucide-react'
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
/** 四隅のリサイズ判定エリア（px） */
const CORNER_HIT = 18

type Position = { x: number; y: number }
type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br'

const RESIZE_CORNER_SIGNS: Record<ResizeCorner, { x: number; y: number }> = {
  tl: { x: -1, y: -1 },
  tr: { x: 1, y: -1 },
  bl: { x: -1, y: 1 },
  br: { x: 1, y: 1 },
}

const RESIZE_CORNER_CURSOR: Record<ResizeCorner, string> = {
  tl: 'nw-resize',
  tr: 'ne-resize',
  bl: 'sw-resize',
  br: 'se-resize',
}

const RESIZE_CORNER_POSITION: Record<ResizeCorner, string> = {
  tl: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2',
  tr: 'right-0 top-0 translate-x-1/2 -translate-y-1/2',
  bl: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2',
  br: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2',
}

const clampScale = (v: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v))

/** ボタン操作と干渉しないよう、インタラクティブ要素上ではドラッグを開始しない */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('button, a, input, select, textarea, [role="dialog"]'))
}

/**
 * 録音操作とリセットをまとめた、画面上を自由に移動できるフロート操作 UI。
 * パネル背景全体で移動、枠の四隅で拡大縮小ができる。
 */
export const FloatingControlDock: React.FC<Props> = ({ darkMode = true }) => {
  const dk = darkMode
  const { rgb } = useAccentTheme()
  const { onResetAll } = usePresentationShell()
  const { isListening, isPaused, startListening, pauseListening } = useTranscription()

  const dockRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const resizeRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startScale: number
    corner: ResizeCorner
  } | null>(null)
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

  useLayoutEffect(() => {
    if (pos) return
    const rect = dockRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({
      x: Math.max(EDGE_MARGIN, (window.innerWidth - rect.width) / 2),
      y: Math.max(EDGE_MARGIN, window.innerHeight - rect.height - EDGE_MARGIN * 2),
    })
  }, [pos])

  useEffect(() => {
    setPos((p) => (p ? clampToViewport(p.x, p.y) : p))
  }, [scale, clampToViewport])

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampToViewport(p.x, p.y) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampToViewport])

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (isInteractiveTarget(e.target)) return
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

  const onResizePointerDown = (corner: ResizeCorner) => (e: React.PointerEvent) => {
    e.stopPropagation()
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScale: scale,
      corner,
    }
    setBusy(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current
    if (!r || r.pointerId !== e.pointerId) return
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    const sign = RESIZE_CORNER_SIGNS[r.corner]
    const delta = (dx * sign.x + dy * sign.y) / 2
    setScale(clampScale(r.startScale + delta / RESIZE_BASE))
  }

  const endResize = (e: React.PointerEvent) => {
    if (resizeRef.current?.pointerId !== e.pointerId) return
    resizeRef.current = null
    setBusy(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const stopPanelPointer = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const recordButton = isListening ? (
    <motion.button
      key="pause"
      type="button"
      onClick={pauseListening}
      onPointerDown={stopPanelPointer}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.14 }}
      whileTap={{ scale: 0.93 }}
      className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-110 ${focusRing} focus-visible:ring-amber-400/70 ${ringOffset}`}
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
      onPointerDown={stopPanelPointer}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.14 }}
      whileTap={{ scale: 0.93 }}
      className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-110 ${focusRing} focus-visible:ring-emerald-400/70 ${ringOffset}`}
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

  const resizeCorners = (['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
    <button
      key={corner}
      type="button"
      aria-label={`${corner} からサイズを変更`}
      title="ドラッグでサイズ変更"
      onPointerDown={onResizePointerDown(corner)}
      onPointerMove={onResizePointerMove}
      onPointerUp={endResize}
      onPointerCancel={endResize}
      className={`absolute z-20 ${RESIZE_CORNER_POSITION[corner]}`}
      style={{
        width: CORNER_HIT,
        height: CORNER_HIT,
        cursor: RESIZE_CORNER_CURSOR[corner],
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
    />
  ))

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
        className={`relative flex cursor-grab items-center gap-2 rounded-full border-2 px-3 py-2.5 backdrop-blur-[2px] active:cursor-grabbing ${
          dk ? 'bg-slate-950/8' : 'bg-white/10'
        }`}
        style={{
          borderColor: accentRgba(rgb, dk ? 0.72 : 0.66),
          boxShadow: dk
            ? `0 10px 28px rgba(2,6,23,0.18), 0 0 16px ${accentRgba(rgb, 0.08)}`
            : `0 10px 24px rgba(15,23,42,0.06), 0 0 12px ${accentRgba(rgb, 0.06)}`,
        }}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="ドラッグで移動"
      >
        <AnimatePresence mode="wait" initial={false}>
          {recordButton}
        </AnimatePresence>

        <AlertDialog.Root open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialog.Trigger asChild>
            <button
              type="button"
              onPointerDown={stopPanelPointer}
              title="文字起こし・用語・履歴などをすべてクリアします"
              aria-label="すべてリセット"
              className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border backdrop-blur-[1px] transition-[filter,background-color,border-color] hover:brightness-110 ${focusRing} focus-visible:ring-rose-400/60 ${ringOffset} ${
                dk
                  ? 'border-slate-500/30 bg-slate-900/12 text-slate-400 hover:border-rose-500/45 hover:bg-rose-500/12 hover:text-rose-300'
                  : 'border-slate-200/40 bg-white/14 text-slate-500 hover:border-rose-300/55 hover:bg-rose-50/35 hover:text-rose-600'
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

        {resizeCorners}
      </div>
    </div>
  )
}
