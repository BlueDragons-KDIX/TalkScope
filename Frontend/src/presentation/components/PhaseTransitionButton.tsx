import React from 'react'
import { StopCircle, Play } from 'lucide-react'
import { usePhaseStore } from '../../stores/phaseStore'
import { useBubbleStore } from '../../stores/bubbleStore'

interface Props {
  darkMode?: boolean
}

export const PhaseTransitionButton: React.FC<Props> = ({ darkMode = true }) => {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isDuring ? '発表を終了する' : '発表中に戻る'}
      aria-label={isDuring ? '発表を終了する' : '発表中に戻る'}
      className={`inline-flex h-[3.25rem] w-[12.5rem] shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-6 text-sm font-bold leading-none shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] ${focusRing} ${ringOffset} ${surface}`}
    >
      {isDuring ? (
        <>
          <StopCircle size={22} strokeWidth={2.25} className="shrink-0" />
          発表終了
        </>
      ) : (
        <>
          <Play size={22} strokeWidth={2.25} className="shrink-0" />
          もどる
        </>
      )}
    </button>
  )
}
