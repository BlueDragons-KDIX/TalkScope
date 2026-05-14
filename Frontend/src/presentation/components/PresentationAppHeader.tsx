import React from 'react'
import { Settings } from 'lucide-react'
import { LayoutPresetMenu } from './LayoutPresetMenu'
import { TestFeaturesPopover } from './TestFeaturesPopover'

export interface PresentationAppHeaderProps {
  darkMode: boolean
  currentPhaseId: string
  onOpenAppearance: () => void
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2'

/**
 * プレゼンレイヤのヘッダー（ブランド・フェーズ・レイアウト・設定・開発テスト）。
 */
export const PresentationAppHeader: React.FC<PresentationAppHeaderProps> = ({
  darkMode,
  currentPhaseId,
  onOpenAppearance,
}) => {
  const dk = darkMode
  const isDuring = currentPhaseId === 'during'
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'
  const settingsPill = dk
    ? 'border-slate-700/80 bg-slate-900/25 text-slate-200 hover:bg-slate-800'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'

  return (
    <header
      className={`flex-shrink-0 flex min-h-[3.25rem] flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5 relative z-50 ${dk ? 'bg-[#0d0e1a] border-slate-800' : 'bg-white border-slate-200'}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <span
          className={`select-none text-2xl font-black tracking-tighter sm:text-3xl tabular-nums ${dk
            ? 'bg-gradient-to-br from-white via-slate-100 to-slate-500 bg-clip-text text-transparent [text-shadow:0_0_32px_rgba(255,255,255,0.12)]'
            : 'bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600 bg-clip-text text-transparent'}`}
        >
          TALKSCOPE
        </span>
        <span
          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${isDuring
            ? dk
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-emerald-100 text-emerald-700'
            : dk
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-violet-100 text-violet-700'}`}
        >
          {isDuring ? '発表中' : '発表後'}
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2" aria-label="ツールバー">
        <LayoutPresetMenu darkMode={dk} phaseId="during" menuAlign="right" disabled={!isDuring} labeled />
        <button
          type="button"
          onClick={onOpenAppearance}
          title="設定（表示・文字起こし・マイクなど）"
          className={`flex min-h-10 shrink-0 flex-row items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${focusRing} ${ringOffset} ${settingsPill}`}
          aria-haspopup="dialog"
          aria-label="設定を開く"
        >
          <Settings size={17} strokeWidth={2} />
          <span className="whitespace-nowrap">設定</span>
        </button>
        {import.meta.env.DEV ? <TestFeaturesPopover darkMode={dk} align="right" /> : null}
      </div>
    </header>
  )
}
