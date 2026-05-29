import { useEffect, useRef } from 'react'
import { useBubbleStore, computeSoftLimit, SOFT_LIFESPAN_MS } from '../../stores/bubbleStore'
import { useTermMapWindowSettingsStore } from '../../stores/termMapWindowSettingsStore'
import { useTermStore } from '../../stores/termStore'

export const LEGACY_SOFT_LIMIT = 20
export const DEATH_ROW_MS = SOFT_LIFESPAN_MS

export function useBubbleLifecycle() {
  const deathRowRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const intervalId = setInterval(() => {
      const hardLimit = useTermMapWindowSettingsStore.getState().maxVisibleTerms
      const softLimit = computeSoftLimit(hardLimit)
      const pinnedTermIds = useTermStore.getState().pinnedTermIds
      const { visibleTermIds, bubbleTimestamps, removeVisibleTermId } = useBubbleStore.getState()
      const deathRow = deathRowRef.current
      const now = Date.now()

      if (visibleTermIds.length <= softLimit) {
        deathRowRef.current = {}
        return
      }

      const sorted = [...visibleTermIds].sort(
        (a, b) => (bubbleTimestamps[a] ?? 0) - (bubbleTimestamps[b] ?? 0),
      )

      if (sorted.length > hardLimit) {
        let overflowCount = sorted.length - hardLimit
        for (const termId of sorted) {
          if (overflowCount <= 0) break
          if (pinnedTermIds.has(termId)) continue
          removeVisibleTermId(termId)
          delete deathRow[termId]
          overflowCount -= 1
        }
      }

      const refreshedVisible = useBubbleStore.getState().visibleTermIds
      const refreshedTimestamps = useBubbleStore.getState().bubbleTimestamps
      if (refreshedVisible.length <= softLimit) {
        deathRowRef.current = {}
        return
      }

      const refreshedSorted = [...refreshedVisible].sort(
        (a, b) => (refreshedTimestamps[a] ?? 0) - (refreshedTimestamps[b] ?? 0),
      )
      const candidateCount = refreshedSorted.length - softLimit
      const deathCandidates = refreshedSorted
        .filter((termId) => !pinnedTermIds.has(termId))
        .slice(0, candidateCount)
      const candidateIds = new Set(deathCandidates)
      const survivors = refreshedSorted.filter((termId) => !candidateIds.has(termId))

      survivors.forEach((termId) => {
        delete deathRow[termId]
      })

      deathCandidates.forEach((termId) => {
        if (deathRow[termId] == null) {
          deathRow[termId] = now
          return
        }
        if (now - deathRow[termId] >= DEATH_ROW_MS) {
          removeVisibleTermId(termId)
          delete deathRow[termId]
        }
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])
}
