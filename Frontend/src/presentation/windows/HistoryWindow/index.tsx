import React from 'react'
import { HistoryPanel } from '../../../app/components/HistoryPanel'
import { useTermStore } from '../../../stores/termStore'
import type { WindowProps } from '../IWindowDefinition'
import type { Term } from '../../../domain/entities/Term'

export const HistoryWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const searchHistory = useTermStore(s => s.searchHistory)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const clearHistory = useTermStore(s => s.clearHistory)

  const handleTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
  }

  return (
    <HistoryPanel
      history={searchHistory as Term[]}
      onTermClick={handleTermClick}
      onClear={clearHistory}
      darkMode={darkMode}
    />
  )
}
