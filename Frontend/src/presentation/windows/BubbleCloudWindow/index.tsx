import React, { useMemo } from 'react'
import { BubbleCloud } from '../../../app/components/BubbleCloud'
import { useTermStore } from '../../../stores/termStore'
import { useBubbleStore } from '../../../stores/bubbleStore'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'
import { useScoreUpdate } from '../../hooks/useScoreUpdate'

export const BubbleCloudWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const activeTerms = useTermStore(s => s.activeTerms)
  const visibleTermIds = useBubbleStore(s => s.visibleTermIds)
  const bubbleTerms = useMemo(
    () => visibleTermIds
      .map((id) => activeTerms.find((term) => term.id === id))
      .filter((term): term is Term => term != null),
    [activeTerms, visibleTermIds],
  )
  const isPinned = useTermStore(s => s.pinnedTermIds)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const togglePin = useTermStore(s => s.togglePin)
  const { onClick: onScoreClick } = useScoreUpdate()

  const handleTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
    onScoreClick(term.id)
  }

  return (
    <BubbleCloud
      activeTerms={bubbleTerms as any}
      onTermClick={handleTermClick}
      darkMode={darkMode}
      isPinned={isPinned}
      onTogglePin={togglePin}
    />
  )
}
