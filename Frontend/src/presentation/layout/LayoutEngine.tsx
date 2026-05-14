import React, { useCallback, useEffect, useRef, useState } from 'react'
import { GripHorizontal, X } from 'lucide-react'
import type { DropZone, LayoutNode } from '../../domain/entities/Layout'
import { movePanel, updateRatio } from './layoutUtils'
import { getWindowDefinition } from '../windows/registry'

const ACCENT_RGB: Record<string, string> = {
  blue: '59,130,246',
  indigo: '99,102,241',
  purple: '168,85,247',
  rose: '244,63,94',
  emerald: '16,185,129',
  orange: '249,115,22',
}

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
  const accentRgb = ACCENT_RGB[themeColor] ?? ACCENT_RGB['indigo']
  const borderStyle = `2px solid rgba(${accentRgb},0.6)`
  const headerBg = `rgba(${accentRgb},0.07)`
  const dotColor = `rgba(${accentRgb},1)`

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
      return (
        <div
          key={node.id}
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            width: '100%', height: '100%', minWidth: 0, minHeight: 0,
            overflow: 'hidden', border: borderStyle, borderRadius: 6,
          }}
        >
          <div
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragging(node.windowId) }}
            onDragEnd={() => { setDragging(null); setDropInfo(null) }}
            className={`flex items-center gap-1.5 px-2.5 py-1 flex-shrink-0 cursor-grab active:cursor-grabbing select-none border-b ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            style={{ backgroundColor: headerBg, borderBottomColor: `rgba(${accentRgb},0.3)` }}
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
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {WindowComponent
              ? <WindowComponent windowId={node.windowId} darkMode={darkMode} />
              : <div className="p-4 text-sm text-slate-400">ウィンドウ未登録: {node.windowId}</div>
            }
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
    const aStyle: React.CSSProperties = isH
      ? { width: `${node.ratio * 100}%`, flexShrink: 0, flexGrow: 0, minWidth: 0, overflow: 'hidden', display: 'flex' }
      : { height: `${node.ratio * 100}%`, flexShrink: 0, flexGrow: 0, minHeight: 0, overflow: 'hidden', display: 'flex' }
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
  }, [dragging, dropInfo, darkMode, accentRgb, borderStyle, headerBg, dotColor, calcZone, onLayoutChange, onClose])

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {renderNode(layout)}
    </div>
  )
}
