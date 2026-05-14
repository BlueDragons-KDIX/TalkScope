import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GripHorizontal, X } from 'lucide-react'
import type { DropZone, LayoutNode } from '../../domain/entities/Layout'
import { movePanel, updateRatio } from './layoutUtils'
import { getWindowDefinition } from '../windows/registry'
import {
  SYSTEM_CONTROL_WINDOW_ID,
  SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX,
  SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX,
} from '../constants/systemControlWindow'
import { getAccentRgb } from '../../theme/accentTokens'

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
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const delta = resizing.direction === 'h' ? e.clientX - resizing.startPos : e.clientY - resizing.startPos
      const newRatio = resizing.startRatio + delta / resizing.containerSize
      onLayoutChange(updateRatio(layoutRef.current, resizing.splitId, newRatio))
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
            className={`flex items-center gap-1.5 px-2.5 py-1 flex-shrink-0 cursor-grab active:cursor-grabbing select-none border-b font-semibold ${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            style={{ backgroundColor: headerBg, borderBottomColor: `rgba(${accentRgb},0.42)` }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
            <GripHorizontal size={10} className="opacity-40 flex-shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{label}</span>
            {onClose && closable && (
              <button
                onClick={e => { e.stopPropagation(); onClose(node.windowId) }}
                className={`ml-auto p-0.5 rounded transition-colors ${darkMode ? 'hover:bg-slate-700 hover:text-white' : 'hover:bg-slate-200 hover:text-black'}`}
                aria-label="閉じる"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
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
    const isSystemControlDockPane = isH && node.a.type === 'leaf' && node.a.windowId === SYSTEM_CONTROL_WINDOW_ID
    const aStyle: React.CSSProperties = isH
      ? {
          width: `${node.ratio * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
          minWidth: isSystemControlDockPane ? SYSTEM_CONTROL_DOCK_MIN_WIDTH_PX : 0,
          minHeight: isSystemControlDockPane ? SYSTEM_CONTROL_DOCK_MIN_HEIGHT_PX : 0,
          overflow: 'hidden',
          display: 'flex',
        }
      : {
          height: `${node.ratio * 100}%`,
          flexShrink: 0,
          flexGrow: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
        }
    const bStyle: React.CSSProperties = { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex' }

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
            setResizing({
              splitId: node.id,
              startPos: isH ? e.clientX : e.clientY,
              startRatio: node.ratio,
              direction: node.direction,
              containerSize: (isH ? rect.width : rect.height) - 4,
            })
          }}
        />
        <div style={bStyle}>{renderNode(node.b)}</div>
      </div>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dropInfo, darkMode, accentRgb, borderStyle, headerBg, dotColor, panelGlow, calcZone, onLayoutChange, onClose])

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {renderNode(layout)}
    </div>
  )
}
