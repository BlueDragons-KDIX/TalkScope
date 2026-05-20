import React, { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLayoutStore } from '../../stores/layoutStore'
import {
  MAX_ORIGINAL_LAYOUT_TEMPLATES,
  useLayoutTemplateStore,
} from '../../stores/layoutTemplateStore'
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
  const currentLayout = useLayoutStore(s => s.layouts[phaseId])
  const originalTemplates = useLayoutTemplateStore(s => s.templates)
  const addOriginalTemplate = useLayoutTemplateStore(s => s.addTemplate)
  const removeOriginalTemplate = useLayoutTemplateStore(s => s.removeTemplate)
  const menuPos = menuAlign === 'right' ? 'right-0 left-auto' : 'left-0'
  const ringOffset = darkMode ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'
  const dk = darkMode
  const originalTemplateLimitReached = originalTemplates.length >= MAX_ORIGINAL_LAYOUT_TEMPLATES

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

  const cloneLayout = (layout: LayoutNode): LayoutNode =>
    JSON.parse(JSON.stringify(layout)) as LayoutNode

  const addCurrentLayoutAsOriginal = () => {
    if (!currentLayout) {
      toast.warning('保存できる現在のレイアウトがありません')
      return
    }
    if (originalTemplateLimitReached) {
      toast.warning(`オリジナルレイアウトは最大${MAX_ORIGINAL_LAYOUT_TEMPLATES}個まで保存できます`)
      return
    }

    const name = window.prompt('オリジナルレイアウト名を入力してください')
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.warning('レイアウト名を入力してください')
      return
    }

    try {
      addOriginalTemplate(trimmed, cloneLayout(currentLayout))
      toast.success(`「${trimmed}」を保存しました`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'レイアウトを保存できませんでした'
      toast.error(message)
    }
  }

  const removeOriginalLayout = (templateId: string, templateName: string) => {
    removeOriginalTemplate(templateId)
    toast.info(`「${templateName}」を削除しました`)
  }

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
          <div className={`border-t py-1 ${dk ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2 px-2.5 py-1">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${dk ? 'text-cyan-300/80' : 'text-cyan-700/80'}`}>
                  オリジナルテンプレート
                </p>
                <p className={`mt-0.5 text-[9px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  {originalTemplates.length}/{MAX_ORIGINAL_LAYOUT_TEMPLATES}
                </p>
              </div>
              <button
                type="button"
                onClick={addCurrentLayoutAsOriginal}
                disabled={!currentLayout || originalTemplateLimitReached}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${dk
                  ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/18'
                  : 'border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50'}`}
              >
                <Plus size={12} />
                追加
              </button>
            </div>
            {originalTemplates.length > 0 ? (
              <div className="pb-1">
                {originalTemplates.map(template => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-1 px-1.5 ${dk ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setLayout(phaseId, cloneLayout(template.layout))
                        setOpen(false)
                      }}
                      className={`min-w-0 flex-1 px-1.5 py-2 text-left text-xs font-medium transition-colors ${dk
                        ? 'text-slate-300'
                        : 'text-slate-700'}`}
                    >
                      <span className="block truncate">{template.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        removeOriginalLayout(template.id, template.name)
                      }}
                      className={`shrink-0 rounded-md p-1.5 transition-colors ${dk
                        ? 'text-slate-500 hover:bg-red-500/15 hover:text-red-300'
                        : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
                      aria-label={`${template.name} を削除`}
                      title={`${template.name} を削除`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`px-2.5 pb-2 text-[10px] leading-relaxed ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                追加ボタンから現在のレイアウトを保存できます。
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
