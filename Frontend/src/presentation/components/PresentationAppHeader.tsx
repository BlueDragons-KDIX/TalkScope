import React from 'react'
import { RotateCcw, Settings } from 'lucide-react'
import { LayoutPresetMenu } from './LayoutPresetMenu'
import { TestFeaturesPopover } from './TestFeaturesPopover'
import { PhaseTransitionButton } from './PhaseTransitionButton'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2'

export interface PresentationAppHeaderProps {
  darkMode: boolean
  currentPhaseId: string
  onReset: () => void
  onOpenAppearance: () => void
}

/**
 * プレゼンレイヤのグローバルツールバー。
 * 開発者向けテストは `import.meta.env.DEV` のときのみ左側（フェーズ表示の右）に表示。
 */
export const PresentationAppHeader: React.FC<PresentationAppHeaderProps> = ({
  darkMode,
  currentPhaseId,
  onReset,
  onOpenAppearance,
}) => {
  const dk = darkMode
  const isDuring = currentPhaseId === 'during'
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const settingsBtn = dk
    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

  const resetBtn = dk
    ? 'border border-amber-500/45 bg-amber-500/12 text-amber-300 hover:bg-amber-500/22 hover:border-amber-400/60'
    : 'border border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400'

  return (
    <header
      className={`flex-shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b relative z-50 min-h-[3rem] ${dk ? 'bg-[#0d0e1a] border-slate-800' : 'bg-white border-slate-200'}`}
    >
      {/* 左: ブランド（強調） + フェーズ +（DEV のみ）テスト */}
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
        {import.meta.env.DEV ? (
          <div className="shrink-0 border-l border-slate-600/40 pl-2.5 sm:pl-3">
            <TestFeaturesPopover darkMode={darkMode} align="left" />
          </div>
        ) : null}
      </div>

      {/* 右: レイアウト（発表後は表示のみ・無効） | 設定 | リセット | フェーズ遷移 */}
      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-2.5">
        <LayoutPresetMenu darkMode={darkMode} phaseId="during" menuAlign="right" disabled={!isDuring} />
        <button
          type="button"
          onClick={onOpenAppearance}
          title="設定"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${settingsBtn}`}
          aria-haspopup="dialog"
          aria-label="設定を開く"
        >
          <Settings size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onReset}
          title="文字起こし・用語・履歴などをすべてクリアします"
          className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${resetBtn}`}
          aria-label="すべてのウィンドウをリセット"
        >
          <RotateCcw size={19} strokeWidth={2} />
        </button>
        <PhaseTransitionButton darkMode={darkMode} />
      </div>
    </header>
  )
}
