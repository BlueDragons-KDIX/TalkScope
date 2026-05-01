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

  const handleEndPresentation = () => {
    clearBubbles()
    transitionTo('after')
  }

  const handleBackToPresentation = () => {
    transitionTo('during')
  }

  if (currentPhaseId === 'during') {
    return (
      <button
        onClick={handleEndPresentation}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${darkMode
          ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
          : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
      >
        <StopCircle size={12} />
        発表終了
      </button>
    )
  }

  return (
    <button
      onClick={handleBackToPresentation}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${darkMode
        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
    >
      <Play size={12} />
      発表中に戻る
    </button>
  )
}
