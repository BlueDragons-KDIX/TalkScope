import React, { useEffect, useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useLayoutStore } from '../../stores/layoutStore'
import { useLayoutTemplateStore } from '../../stores/layoutTemplateStore'
import type { LayoutNode } from '../../domain/entities/Layout'
import { getScriptableLayoutTemplates } from '../layout/ScriptableLayoutTemplates'

const SCRIPTABLE_TEMPLATES = getScriptableLayoutTemplates()

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
  const customTemplates = useLayoutTemplateStore(s => s.templates)
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
          <div className="py-1">
            {SCRIPTABLE_TEMPLATES.map(template => (
              <button
                key={template.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  const layout = JSON.parse(JSON.stringify(template.layout)) as LayoutNode
                  setLayout(phaseId, layout)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${dk
                  ? 'text-slate-300 hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {template.name}
              </button>
            ))}
          </div>
          {customTemplates.length > 0 ? (
            <div className={`border-t py-1 ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${dk ? 'text-cyan-300/80' : 'text-cyan-700/80'}`}>
                GUI追加テンプレート
              </div>
              {customTemplates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const layout = JSON.parse(JSON.stringify(template.layout)) as LayoutNode
                    setLayout(phaseId, layout)
                    setOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${dk
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
