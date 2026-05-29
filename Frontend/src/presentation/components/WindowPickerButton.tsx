import React, { useEffect, useRef, useState } from 'react'
import { Layers } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import {
  addWindowToLayout,
  collectWindowIdsInLayout,
  leafNode,
  removeWindowFromLayout,
} from '../layout/layoutUtils'
import { getLayoutSelectableWindows } from '../windows/registry'
import { useAccentTheme } from '../../theme/AccentThemeContext'

interface Props {
  darkMode?: boolean
  phaseId: string
  menuAlign?: 'left' | 'right'
  disabled?: boolean
  labeled?: boolean
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--app-accent-rgb)/0.45)] focus-visible:ring-offset-2'

export const WindowPickerButton: React.FC<Props> = ({
  darkMode = true,
  phaseId,
  menuAlign = 'right',
  disabled = false,
  labeled = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const { rgb } = useAccentTheme()
  const setLayout = useLayoutStore(s => s.setLayout)
  const layout = useLayoutStore(s => s.layouts[phaseId])
  const menuPos = menuAlign === 'right' ? 'right-0 left-auto' : 'left-0'
  const ringOffset = darkMode ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'
  const dk = darkMode

  const selectable = getLayoutSelectableWindows()
  const activeIds = layout ? collectWindowIdsInLayout(layout) : new Set<string>()
  const activeCount = activeIds.size

  const sortByLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'ja')
  const checkedDefs = selectable.filter(d => activeIds.has(d.id)).sort(sortByLabel)
  const uncheckedDefs = selectable.filter(d => !activeIds.has(d.id)).sort(sortByLabel)
  const orderedRows = [...checkedDefs, ...uncheckedDefs]

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

  const applyToggle = (windowId: string, checked: boolean) => {
    const cur = useLayoutStore.getState().layouts[phaseId]
    if (checked) {
      if (!cur) setLayout(phaseId, leafNode(windowId))
      else setLayout(phaseId, addWindowToLayout(cur, windowId))
    } else {
      if (!cur) return
      setLayout(phaseId, removeWindowFromLayout(cur, windowId))
    }
  }

  const triggerCls = `relative z-0 flex min-h-10 shrink-0 flex-row items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${focusRing} ${ringOffset} ${dk
    ? 'border-slate-700/80 bg-slate-900/25 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${disabled
    ? 'pointer-events-none cursor-not-allowed opacity-[0.42] saturate-50'
    : ''}`

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex rounded-lg ${disabled ? 'cursor-not-allowed' : ''}`}
      title={disabled ? '発表中のみウィンドウを変更できます' : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v) }}
        aria-label={disabled ? 'ウィンドウ（発表後は利用不可）' : 'ウィンドウの表示切替'}
        aria-expanded={!disabled && open}
        aria-disabled={disabled}
        aria-haspopup="true"
        className={triggerCls}
      >
        <Layers size={17} strokeWidth={2} />
        {labeled ? <span className="whitespace-nowrap">ウィンドウ</span> : null}
        {activeCount > 0 && (
          <span
            className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white"
            style={{ backgroundColor: `rgb(${rgb})` }}
            aria-label={`${activeCount}個表示中`}
          >
            {activeCount}
          </span>
        )}
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
          className={`absolute top-full ${menuPos} mt-1 z-[60] w-[min(92vw,260px)] min-w-[220px] overflow-hidden rounded-lg border shadow-xl ${dk
            ? 'border-slate-700 bg-[#0d0e1a]'
            : 'border-slate-200 bg-white'}`}
          role="menu"
        >
          <div className={`border-b px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${dk ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            ウィンドウ表示
          </div>
          <div className="py-1">
            {orderedRows.map(def => {
              const isActive = activeIds.has(def.id)
              return (
                <label
                  key={def.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs font-medium transition-colors ${dk ? 'text-slate-200 hover:bg-slate-800/80' : 'text-slate-800 hover:bg-slate-50'}`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors"
                      style={{ backgroundColor: isActive ? `rgb(${rgb})` : (dk ? 'rgb(71,85,105)' : 'rgb(203,213,225)') }}
                    />
                    <span className="truncate">{def.label}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 rounded border"
                    style={{ accentColor: `rgb(${rgb})` }}
                    checked={isActive}
                    onChange={e => {
                      e.stopPropagation()
                      applyToggle(def.id, e.target.checked)
                    }}
                    aria-label={`${def.label}を表示`}
                  />
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
