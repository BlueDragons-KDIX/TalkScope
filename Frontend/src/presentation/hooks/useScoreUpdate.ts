import { useCallback } from 'react'
import { defaultScoreUpdateStrategy } from '../../infrastructure/adapters/DefaultScoreUpdateStrategy'
import { useTermStore } from '../../stores/termStore'

export function useScoreUpdate() {
  const onClick = useCallback((termId: string) => {
    const store = useTermStore.getState()
    const term = store.activeTerms.find((activeTerm) => activeTerm.id === termId)
    if (!term) return
    if (store.pinnedTermIds.has(termId)) return
    const newScore = defaultScoreUpdateStrategy.onClick(term.score)
    store.updateTermScore(termId, newScore)
  }, [])

  return { onClick }
}
