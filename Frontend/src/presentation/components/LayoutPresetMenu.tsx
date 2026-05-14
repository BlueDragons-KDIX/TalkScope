import React, { useEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import {
  makeDefaultLayout,
  makeLeftRightLayout,
  make2x2Layout,
  makeHorizontalLayout,
  makeVerticalLayout,
} from '../layout/layoutUtils'

const PRESETS = [
  { key: 'default', label: 'デフォルト', make: makeDefaultLayout },
  { key: 'leftRight', label: '左右+縦分割', make: makeLeftRightLayout },
  { key: '2x2', label: '2×2', make: make2x2Layout },
  { key: 'horizontal', label: '横4列', make: makeHorizontalLayout },
  { key: 'vertical', label: '縦4列', make: makeVerticalLayout },
]

interface Props {
  darkMode?: boolean
  phaseId: string
  menuAlign?: 'left' | 'right'
  disabled?: boolean
  labeled?: boolean
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--app-accent-rgb)/0.45)] focus-visible:ring-offset-2'

export const LayoutPresetMenu: React.FC<Props> = ({
  darkMode = true,
  phaseId,
  menuAlign = 'right',
  disabled = false,
  labeled = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const setLayout = useLayoutStore(s => s.setLayout)
  const menuPos = menuAlign === 'right' ? 'right-0 left-auto' : 'left-0'
  const ringOffset = darkMode ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'
  const dk = darkMode

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!open || disabled) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, disabled])

  const triggerLabeled = `relative z-0 flex min-h-10 shrink-0 flex-row items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${focusRing} ${ringOffset} ${dk
    ? 'border-slate-700/80 bg-slate-900/25 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${disabled
    ? 'pointer-events-none cursor-not-allowed opacity-[0.42] saturate-50'
    : ''}`

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex rounded-lg ${disabled ? 'cursor-not-allowed' : ''}`}
      title={disabled ? '発表中のみレイアウトを変更できます' : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v) }}
        aria-label={disabled ? 'レイアウト（発表後は利用不可）' : 'レイアウトプリセット'}
        aria-expanded={!disabled && open}
        aria-disabled={disabled}
        aria-haspopup="true"
        className={triggerLabeled}
      >
        <LayoutGrid size={17} strokeWidth={2} />
        {labeled ? <span className="whitespace-nowrap">レイアウト</span> : null}
      </button>

      {disabled ? (
        <span
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg"
          aria-hidden
        >
          <span className={`absolute h-[2px] w-[140%] -rotate-[38deg] bg-current ${dk ? 'text-slate-500' : 'text-slate-600'}`} />
        </span>
      ) : null}

      {!disabled && open && (
        <div
          className={`absolute top-full ${menuPos} mt-1 z-[60] w-[min(92vw,240px)] min-w-[200px] overflow-hidden rounded-lg border shadow-xl ${dk
            ? 'border-slate-700 bg-[#0d0e1a]'
            : 'border-slate-200 bg-white'}`}
          role="menu"
        >
          <div className={`border-b px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${dk ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            レイアウトテンプレート
          </div>
          <div className="py-1">
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLayout(phaseId, p.make())
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${dk
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
