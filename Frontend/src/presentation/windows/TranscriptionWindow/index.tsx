import React from 'react'
import { TranscriptionView } from '../../../app/components/TranscriptionView'
import { useTranscription } from '../../hooks/useTranscription'
import { useDemoTools } from '../../context/DemoToolsContext'
import { useTermStore } from '../../../stores/termStore'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'

export const TranscriptionWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const demoStream = useDemoTools()
  const { transcript, isListening } = useTranscription()
  const selectTerm = useTermStore(s => s.selectTerm)
  const togglePin = useTermStore(s => s.togglePin)
  const isPinned = useTermStore(s => s.pinnedTermIds)
  const activeTerms = useTermStore(s => s.activeTerms)

  return (
    <TranscriptionView
      transcript={transcript}
      isListening={isListening}
      showRecordingCluster={false}
      showEmbeddedResetButton={false}
      onTermClick={(term: Term) => selectTerm(term)}
      onTermHover={() => {}}
      isPinned={isPinned}
      onTogglePin={togglePin}
      demoStream={demoStream}
      showEmbeddedDemoControls={false}
      darkMode={darkMode}
      apiTerms={activeTerms as any}
    />
  )
}
