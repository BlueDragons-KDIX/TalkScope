import React, { useMemo } from 'react'
import { BubbleCloud } from '../../../app/components/BubbleCloud'
import { useTermStore } from '../../../stores/termStore'
import { useTranscriptStore } from '../../../stores/transcriptStore'
import { countTermFrequencies } from '../../../app/utils/termDetection'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'
import { useScoreUpdate } from '../../hooks/useScoreUpdate'

export const BubbleCloudWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const transcript = useTranscriptStore(s => s.transcript)
  const activeTerms = useTermStore(s => s.activeTerms)
  const termFrequencies = useMemo(
    () => countTermFrequencies(transcript, activeTerms as Term[]),
    [transcript, activeTerms],
  )
  const termClickWeights = useTermStore(s => s.termClickWeights)
  const isPinned = useTermStore(s => s.pinnedTermIds)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const incrementClickWeight = useTermStore(s => s.incrementClickWeight)
  const togglePin = useTermStore(s => s.togglePin)
  const { onClick: onScoreClick } = useScoreUpdate()

  const handleTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
    incrementClickWeight(term.id)
    onScoreClick(term.id)
  }

  return (
    <BubbleCloud
      activeTerms={activeTerms as any}
      termWeights={termClickWeights}
      termFrequencies={termFrequencies}
      onTermClick={handleTermClick}
      darkMode={darkMode}
      isPinned={isPinned}
      onTogglePin={togglePin}
    />
  )
}
