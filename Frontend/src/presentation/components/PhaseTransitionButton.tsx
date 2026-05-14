import React from 'react'
import { StopCircle, Play } from 'lucide-react'
import { usePhaseStore } from '../../stores/phaseStore'
import { useBubbleStore } from '../../stores/bubbleStore'

interface Props {
  darkMode?: boolean
  /** 操作ドック内: 録音ボタンと横並びの低いボタン */
  compact?: boolean
}

export const PhaseTransitionButton: React.FC<Props> = ({ darkMode = true, compact = false }) => {
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const transitionTo = usePhaseStore(s => s.transitionTo)
  const clearBubbles = useBubbleStore(s => s.clearBubbles)

  const isDuring = currentPhaseId === 'during'

  const handleClick = () => {
    if (isDuring) {
      clearBubbles()
      transitionTo('after')
    } else {
      transitionTo('during')
    }
  }

  const ringOffset = darkMode ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'
  const focusRing = isDuring
    ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 focus-visible:ring-offset-2'
    : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2'

  const surface = isDuring
    ? darkMode
      ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-rose-900/40 hover:from-rose-400 hover:to-rose-600'
      : 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-rose-900/25 hover:from-rose-600 hover:to-rose-700'
    : darkMode
      ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-emerald-900/40 hover:from-emerald-400 hover:to-emerald-600'
      : 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-emerald-900/25 hover:from-emerald-600 hover:to-emerald-700'

  const iconSize = compact ? 16 : 22

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDuring ? '発表を終了する' : '発表中に戻る'}
      aria-label={isDuring ? '発表を終了する' : '発表中に戻る'}
      className={`inline-flex items-center justify-center font-bold leading-none shadow-md transition-transform active:scale-[0.98] ${
        compact
          ? 'min-h-11 h-11 min-w-0 flex-1 flex-row gap-1.5 rounded-lg px-2.5 text-[11px] hover:scale-[1.01]'
          : 'w-full h-[3.25rem] shrink-0 gap-2.5 rounded-xl px-6 text-sm whitespace-nowrap shadow-lg hover:scale-[1.01]'
      } ${focusRing} ${ringOffset} ${surface}`}
    >
      {isDuring ? (
        <>
          <StopCircle size={iconSize} strokeWidth={2.25} className="shrink-0" />
          <span className="min-w-0 truncate">発表終了</span>
        </>
      ) : (
        <>
          <Play size={iconSize} strokeWidth={2.25} className="shrink-0" />
          <span className="min-w-0 truncate">もどる</span>
        </>
      )}
    </button>
  )
}
