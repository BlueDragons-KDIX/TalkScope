import { useEffect, useRef } from 'react'
import { useTermStore } from '../../stores/termStore'
import { useTermMapWindowSettingsStore } from '../../stores/termMapWindowSettingsStore'

export const LEGACY_SOFT_LIMIT = 20
export const DEATH_ROW_MS = 5000

export function useBubbleLifecycle() {
  const deathRowRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const intervalId = setInterval(() => {
      const { activeTerms, termTimestamps, pinnedTermIds, removeTermById } = useTermStore.getState()
      const maxVisibleTerms = useTermMapWindowSettingsStore.getState().maxVisibleTerms
      const hardLimit = maxVisibleTerms
      const softLimit = Math.min(LEGACY_SOFT_LIMIT, hardLimit)
      const deathRow = deathRowRef.current
      const now = Date.now()

      if (activeTerms.length <= softLimit) {
        deathRowRef.current = {}
        return
      }

      const sorted = [...activeTerms].sort(
        (a, b) => (termTimestamps[a.id] ?? 0) - (termTimestamps[b.id] ?? 0),
      )

      if (sorted.length > hardLimit) {
        let overflowCount = sorted.length - hardLimit
        for (const term of sorted) {
          if (overflowCount <= 0) break
          if (pinnedTermIds.has(term.id)) continue
          removeTermById(term.id)
          delete deathRow[term.id]
          overflowCount -= 1
        }
      }

      const refreshedActiveTerms = useTermStore.getState().activeTerms
      if (refreshedActiveTerms.length <= softLimit) {
        deathRowRef.current = {}
        return
      }

      const refreshedSorted = [...refreshedActiveTerms].sort(
        (a, b) => (termTimestamps[a.id] ?? 0) - (termTimestamps[b.id] ?? 0),
      )
      const candidateCount = refreshedSorted.length - softLimit
      const deathCandidates = refreshedSorted
        .filter((term) => !pinnedTermIds.has(term.id))
        .slice(0, candidateCount)
      const candidateIds = new Set(deathCandidates.map((term) => term.id))
      const survivors = refreshedSorted.filter((term) => !candidateIds.has(term.id))

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
