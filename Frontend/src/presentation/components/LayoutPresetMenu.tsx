import React, { useEffect, useState } from 'react'
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
  { key: 'default',    label: 'デフォルト', make: makeDefaultLayout },
  { key: 'leftRight',  label: '左右+縦分割', make: makeLeftRightLayout },
  { key: '2x2',        label: '2×2',         make: make2x2Layout },
  { key: 'horizontal', label: '横4列',        make: makeHorizontalLayout },
  { key: 'vertical',   label: '縦4列',        make: makeVerticalLayout },
]

interface Props {
  darkMode?: boolean
  phaseId: string
  /** ドロップダウンの水平位置（ヘッダー右寄せ時は right） */
  menuAlign?: 'left' | 'right'
  /** true のとき表示は維持するが操作不可（発表後など） */
  disabled?: boolean
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2'

export const LayoutPresetMenu: React.FC<Props> = ({
  darkMode = true,
  phaseId,
  menuAlign = 'right',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const setLayout = useLayoutStore(s => s.setLayout)
  const menuPos = menuAlign === 'right' ? 'right-0 left-auto' : 'left-0'
  const ringOffset = darkMode ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const toggle = () => {
    if (!disabled) setOpen(v => !v)
  }

  return (
    <div
      className={`relative inline-flex rounded-full ${disabled ? 'cursor-not-allowed' : ''}`}
      title={disabled ? '発表中のみレイアウトを変更できます' : undefined}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-label={disabled ? 'レイアウトプリセット（発表後は利用不可）' : 'レイアウトプリセットを開く'}
        aria-expanded={!disabled && open}
        aria-disabled={disabled}
        className={`relative z-0 flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${darkMode
          ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${disabled
          ? 'pointer-events-none opacity-[0.42] saturate-50'
          : ''}`}
      >
        <LayoutGrid size={18} strokeWidth={2} />
      </button>
      {disabled ? (
        <span
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-full"
          aria-hidden
        >
          <span
            className={`absolute h-[2px] w-[140%] -rotate-[38deg] bg-current ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}
          />
        </span>
      ) : null}
      {!disabled && open && (
        <div
          className={`absolute top-full ${menuPos} mt-1 z-50 rounded-lg shadow-xl border py-1 min-w-[120px] ${darkMode
            ? 'bg-[#0d0e1a] border-slate-700'
            : 'bg-white border-slate-200'}`}
        >
          {PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => { setLayout(phaseId, p.make()); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${darkMode
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
