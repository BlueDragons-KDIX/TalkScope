import React from 'react'
import { BubbleCloud } from '../../../app/components/BubbleCloud'
import { useTermStore } from '../../../stores/termStore'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'

export const BubbleCloudWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const activeTerms = useTermStore(s => s.activeTerms)
  const termClickWeights = useTermStore(s => s.termClickWeights)
  const isPinned = useTermStore(s => s.pinnedTermIds)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const incrementClickWeight = useTermStore(s => s.incrementClickWeight)
  const togglePin = useTermStore(s => s.togglePin)

  const handleTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
    incrementClickWeight(term.id)
  }

  return (
    <BubbleCloud
      activeTerms={activeTerms as any}
      termWeights={termClickWeights}
      onTermClick={handleTermClick}
      darkMode={darkMode}
      isPinned={isPinned}
      onTogglePin={togglePin}
    />
  )
}
