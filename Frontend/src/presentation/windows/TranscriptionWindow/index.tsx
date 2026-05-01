import React from 'react'
import { TranscriptionView } from '../../../app/components/TranscriptionView'
import { useTranscription } from '../../hooks/useTranscription'
import { useTermStore } from '../../../stores/termStore'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'

export const TranscriptionWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { transcript, isListening, startListening, stopListening, clearTranscript } = useTranscription()
  const selectTerm = useTermStore(s => s.selectTerm)
  const togglePin = useTermStore(s => s.togglePin)
  const isPinned = useTermStore(s => s.pinnedTermIds)
  const activeTerms = useTermStore(s => s.activeTerms)

  const handleToggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  return (
    <TranscriptionView
      transcript={transcript}
      isListening={isListening}
      onToggleListening={handleToggleListening}
      onClearTranscript={clearTranscript}
      onTermClick={(term: Term) => selectTerm(term)}
      onTermHover={() => {}}
      isPinned={isPinned}
      onTogglePin={togglePin}
      darkMode={darkMode}
      apiTerms={activeTerms as any}
    />
  )
}
