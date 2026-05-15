import React from 'react'
import { StopCircle, Play } from 'lucide-react'
import { usePhaseStore } from '../../stores/phaseStore'
import { useBubbleStore } from '../../stores/bubbleStore'

interface Props {
  darkMode?: boolean
  /** 操作ドック内: 録音ボタンの下に配置する従属ボタン */
  compact?: boolean
  /** compact 時に追加で付与するクラス */
  compactClassName?: string
}

export const PhaseTransitionButton: React.FC<Props> = ({ darkMode = true, compact = false, compactClassName = '' }) => {
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const transitionTo = usePhaseStore(s => s.transitionTo)
  const clearBubbles = useBubbleStore(s => s.clearBubbles)
  const dk = darkMode

  const isDuring = currentPhaseId === 'during'

  const handleClick = () => {
    if (isDuring) {
      clearBubbles()
      transitionTo('after')
    } else {
      transitionTo('during')
    }
  }

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  if (compact) {
    const outlineCls = isDuring
      ? dk
        ? 'border-rose-400/65 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_2px_14px_rgba(244,63,94,0.42),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[1.08] focus-visible:ring-rose-400/70'
        : 'border-rose-500/70 bg-gradient-to-b from-rose-400 to-rose-600 text-white shadow-[0_2px_12px_rgba(244,63,94,0.26),inset_0_1px_0_rgba(255,255,255,0.24)] hover:brightness-[1.05] focus-visible:ring-rose-400/70'
      : dk
        ? 'border-sky-400/65 bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-[0_2px_14px_rgba(14,165,233,0.38),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[1.08] focus-visible:ring-sky-400/70'
        : 'border-sky-500/70 bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-[0_2px_12px_rgba(14,165,233,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] hover:brightness-[1.05] focus-visible:ring-sky-400/70'

    return (
      <button
        type="button"
        onClick={handleClick}
        title={isDuring ? '発表を終了する' : '発表中に戻る'}
        aria-label={isDuring ? '発表を終了する' : '発表中に戻る'}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-2.5 py-2 text-xs font-bold transition-colors active:scale-[0.98] ${outlineCls} ${focusRing} ${ringOffset} ${compactClassName}`}
      >
        {isDuring ? (
          <>
            <StopCircle size={14} strokeWidth={2.25} className="shrink-0" />
            <span className="min-w-0 truncate">発表終了</span>
          </>
        ) : (
          <>
            <Play size={14} strokeWidth={2.25} className="shrink-0" />
            <span className="min-w-0 truncate">もどる</span>
          </>
        )}
      </button>
    )
  }

  const surface = isDuring
    ? dk
      ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-rose-900/40 hover:from-rose-400 hover:to-rose-600 focus-visible:ring-rose-400/70'
      : 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-rose-900/25 hover:from-rose-600 hover:to-rose-700 focus-visible:ring-rose-400/70'
    : dk
      ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-emerald-900/40 hover:from-emerald-400 hover:to-emerald-600 focus-visible:ring-emerald-400/70'
      : 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-emerald-900/25 hover:from-emerald-600 hover:to-emerald-700 focus-visible:ring-emerald-400/70'

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDuring ? '発表を終了する' : '発表中に戻る'}
      aria-label={isDuring ? '発表を終了する' : '発表中に戻る'}
      className={`inline-flex h-[3.25rem] w-full shrink-0 items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold leading-none shadow-lg transition-transform active:scale-[0.98] hover:scale-[1.01] ${surface} ${focusRing} ${ringOffset}`}
    >
      {isDuring ? (
        <>
          <StopCircle size={22} strokeWidth={2.25} className="shrink-0" />
          <span className="min-w-0 truncate">発表終了</span>
        </>
      ) : (
        <>
          <Play size={22} strokeWidth={2.25} className="shrink-0" />
          <span className="min-w-0 truncate">もどる</span>
        </>
      )}
    </button>
  )
}
