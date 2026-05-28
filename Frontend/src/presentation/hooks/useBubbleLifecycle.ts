import { useEffect, useRef } from 'react'
import { useTermStore } from '../../stores/termStore'

export const SOFT_LIMIT = 20
export const HARD_LIMIT = 30
export const DEATH_ROW_MS = 5000

export function useBubbleLifecycle() {
  const deathRowRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const intervalId = setInterval(() => {
      const { activeTerms, termTimestamps, removeTermById } = useTermStore.getState()
      const deathRow = deathRowRef.current
      const now = Date.now()

      if (activeTerms.length <= SOFT_LIMIT) {
        deathRowRef.current = {}
        return
      }

      const sorted = [...activeTerms].sort(
        (a, b) => (termTimestamps[a.id] ?? 0) - (termTimestamps[b.id] ?? 0),
      )

      if (sorted.length > HARD_LIMIT) {
        const overflowCount = sorted.length - HARD_LIMIT
        const overflowTerms = sorted.splice(0, overflowCount)
        overflowTerms.forEach((term) => {
          removeTermById(term.id)
          delete deathRow[term.id]
        })
      }

      if (sorted.length <= SOFT_LIMIT) {
        deathRowRef.current = {}
        return
      }

      const candidateCount = sorted.length - SOFT_LIMIT
      const deathCandidates = sorted.slice(0, candidateCount)
      const survivors = sorted.slice(candidateCount)

      survivors.forEach((term) => {
        delete deathRow[term.id]
      })

      deathCandidates.forEach((term) => {
        if (deathRow[term.id] == null) {
          deathRow[term.id] = now
          return
        }
        if (now - deathRow[term.id] >= DEATH_ROW_MS) {
          removeTermById(term.id)
          delete deathRow[term.id]
        }
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])
}
