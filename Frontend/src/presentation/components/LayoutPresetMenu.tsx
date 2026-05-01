import React, { useState } from 'react'
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
}

export const LayoutPresetMenu: React.FC<Props> = ({ darkMode = true, phaseId }) => {
  const [open, setOpen] = useState(false)
  const setLayout = useLayoutStore(s => s.setLayout)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${darkMode
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
      >
        <LayoutGrid size={12} />
        レイアウト
      </button>
      {open && (
        <div
          className={`absolute top-full left-0 mt-1 z-50 rounded-lg shadow-xl border py-1 min-w-[120px] ${darkMode
            ? 'bg-[#0d0e1a] border-slate-700'
            : 'bg-white border-slate-200'}`}
        >
          {PRESETS.map(p => (
            <button
              key={p.key}
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
