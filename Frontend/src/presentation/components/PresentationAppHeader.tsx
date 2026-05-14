import React from 'react'

export interface PresentationAppHeaderProps {
  darkMode: boolean
  currentPhaseId: string
}

/**
 * プレゼンレイヤの最小ヘッダー（操作系は操作ウィンドウへ集約）。
 */
export const PresentationAppHeader: React.FC<PresentationAppHeaderProps> = ({
  darkMode,
  currentPhaseId,
}) => {
  const dk = darkMode
  const isDuring = currentPhaseId === 'during'

  return (
    <header
      className={`flex-shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b relative z-50 min-h-[3rem] ${dk ? 'bg-[#0d0e1a] border-slate-800' : 'bg-white border-slate-200'}`}
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
    </header>
  )
}
