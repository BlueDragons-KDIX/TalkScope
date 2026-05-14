import React, { useEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import {
  addUserWindowToDockedLayout,
  attachSystemControlDock,
  collectUserWindowIdsInLayout,
  leafNode,
  makeDefaultLayout,
  makeLeftRightLayout,
  make2x2Layout,
  makeHorizontalLayout,
  makeVerticalLayout,
  removeUserWindowFromDockedLayout,
} from '../layout/layoutUtils'
import { getLayoutSelectableWindows } from '../windows/registry'

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
  /** ドロップダウンの水平位置（ヘッダー右寄せ時は right） */
  menuAlign?: 'left' | 'right'
  /** true のとき表示は維持するが操作不可（発表後など） */
  disabled?: boolean
  /** 操作ドックなど狭い場所向けの小さめトリガー */
  compact?: boolean
  /** アイコン横に「レイアウト」などのラベルを表示（ヘッダー用） */
  labeled?: boolean
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2'

export const LayoutPresetMenu: React.FC<Props> = ({
  darkMode = true,
  phaseId,
  menuAlign = 'right',
  disabled = false,
  compact = false,
  labeled = false,
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const setLayout = useLayoutStore(s => s.setLayout)
  const layout = useLayoutStore(s => s.layouts[phaseId])
  const menuPos = menuAlign === 'right' ? 'right-0 left-auto' : 'left-0'
  const ringOffset = darkMode ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

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

  const toggle = () => {
    if (!disabled) setOpen(v => !v)
  }

  const iconSize = compact ? 16 : labeled ? 17 : 18

  const triggerIconOnly = `relative z-0 flex shrink-0 items-center justify-center rounded-full transition-colors ${compact ? 'size-9' : 'size-11'} ${focusRing} ${ringOffset} ${darkMode
    ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${disabled
    ? 'pointer-events-none opacity-[0.42] saturate-50'
    : ''}`

  const triggerLabeled = `relative z-0 flex min-h-10 shrink-0 flex-row items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${focusRing} ${ringOffset} ${darkMode
    ? 'border-slate-700/80 bg-slate-900/25 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${disabled
    ? 'pointer-events-none cursor-not-allowed opacity-[0.42] saturate-50'
    : ''}`

  const selectable = getLayoutSelectableWindows()
  const activeIds = layout ? collectUserWindowIdsInLayout(layout) : new Set<string>()
  const sortByLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'ja')
  const checkedDefs = selectable.filter(d => activeIds.has(d.id)).sort(sortByLabel)
  const uncheckedDefs = selectable.filter(d => !activeIds.has(d.id)).sort(sortByLabel)
  const orderedWindowRows = [...checkedDefs, ...uncheckedDefs]

  const applyWindowToggle = (windowId: string, checked: boolean) => {
    const cur = useLayoutStore.getState().layouts[phaseId]
    if (checked) {
      if (!cur) setLayout(phaseId, attachSystemControlDock(leafNode(windowId)))
      else setLayout(phaseId, addUserWindowToDockedLayout(cur, windowId))
    } else {
      if (!cur) return
      setLayout(phaseId, removeUserWindowFromDockedLayout(cur, windowId))
    }
  }

  const dk = darkMode
  const rowHover = dk ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50'
  const chk = dk ? 'accent-indigo-500 border-slate-600' : 'accent-indigo-600 border-slate-300'

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex ${labeled ? 'rounded-lg' : 'rounded-full'} ${disabled ? 'cursor-not-allowed' : ''}`}
      title={disabled ? '発表中のみレイアウトを変更できます' : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-label={disabled ? 'レイアウト（発表後は利用不可）' : 'レイアウトとウィンドウ'}
        aria-expanded={!disabled && open}
        aria-disabled={disabled}
        aria-haspopup="true"
        className={labeled ? triggerLabeled : triggerIconOnly}
      >
        <LayoutGrid size={iconSize} strokeWidth={2} />
        {labeled ? <span className="whitespace-nowrap">レイアウト</span> : null}
      </button>
      {disabled ? (
        <span
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden ${labeled ? 'rounded-lg' : 'rounded-full'}`}
          aria-hidden
        >
          <span
            className={`absolute h-[2px] w-[140%] -rotate-[38deg] bg-current ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}
          />
        </span>
      ) : null}
      {!disabled && open && (
        <div
          className={`absolute top-full ${menuPos} mt-1 z-[60] flex max-h-[min(70vh,420px)] w-[min(92vw,300px)] min-w-[260px] flex-col overflow-hidden rounded-lg border shadow-xl ${darkMode
            ? 'border-slate-700 bg-[#0d0e1a]'
            : 'border-slate-200 bg-white'}`}
          role="menu"
        >
          <div className={`shrink-0 border-b px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${dk ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            ウィンドウ
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {orderedWindowRows.map(def => (
              <label
                key={def.id}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs font-medium ${rowHover} ${dk ? 'text-slate-200' : 'text-slate-800'}`}
              >
                <span className="min-w-0 flex-1 truncate">{def.label}</span>
                <input
                  type="checkbox"
                  className={`size-4 shrink-0 rounded border ${chk}`}
                  checked={activeIds.has(def.id)}
                  onChange={e => {
                    e.stopPropagation()
                    applyWindowToggle(def.id, e.target.checked)
                  }}
                  aria-label={`${def.label}を表示`}
                />
              </label>
            ))}
          </div>
          <div className={`shrink-0 border-t px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${dk ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            レイアウトテンプレート
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLayout(phaseId, p.make())
                  setOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${darkMode
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
