import React from 'react'
import { TermDetailPanel } from '../../../app/components/TermDetailPanel'
import { useTermStore } from '../../../stores/termStore'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'

export const TermDetailWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const selectedTerm = useTermStore(s => s.selectedTerm)
  const selectTerm = useTermStore(s => s.selectTerm)
  const togglePin = useTermStore(s => s.togglePin)
  const pinnedTermIds = useTermStore(s => s.pinnedTermIds)

  return (
    <TermDetailPanel
      term={selectedTerm as Term | null}
      onClose={() => selectTerm(null)}
      onRelatedTermClick={(term: Term) => selectTerm(term)}
      darkMode={darkMode}
      isPinned={selectedTerm ? pinnedTermIds.has(selectedTerm.id) : false}
      onTogglePin={selectedTerm ? () => togglePin(selectedTerm.id) : undefined}
    />
  )
}
