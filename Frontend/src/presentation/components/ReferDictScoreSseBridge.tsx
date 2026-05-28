import type React from 'react'
import { useEffect, useRef } from 'react'
import { useReferDictScoreSse } from '../hooks/useReferDictScoreSse'
import { useTermStore } from '../../stores/termStore'
import { filterByScore } from '../../infrastructure/adapters/ScoreThresholdFilter'
import { defaultScoreUpdateStrategy } from '../../infrastructure/adapters/DefaultScoreUpdateStrategy'
import { FrequencyScoreAdapter } from '../../infrastructure/adapters/FrequencyScoreAdapter'

interface ReferDictScoreSseBridgeProps {
  scoreThreshold?: number
}

/**
 * App ルートに置く配線用（UI なし）。
 * 既定では SSE のみ開く。termStore へ載せる場合は `onTerms` を渡す。
 */
export const ReferDictScoreSseBridge: React.FC<ReferDictScoreSseBridgeProps> = ({
  scoreThreshold,
}) => {
  const adapterRef = useRef<FrequencyScoreAdapter | null>(null)
  if (!adapterRef.current) {
    adapterRef.current = new FrequencyScoreAdapter(defaultScoreUpdateStrategy)
  }

  useEffect(() => {
    const unsub = useTermStore.subscribe((state, prev) => {
      const wasReset = prev.activeTerms.length > 0
        && state.activeTerms.length === 0
        && state.searchHistory.length === 0
        && state.pinnedTermIds.size === 0
      if (wasReset) adapterRef.current?.reset()
    })
    return unsub
  }, [])

  useReferDictScoreSse({
    onTerms: (terms) => {
      const filtered = filterByScore(terms, scoreThreshold)
      const adapted = adapterRef.current?.adapt(filtered)
      if (!adapted) return
      const store = useTermStore.getState()
      store.addTerms(adapted.toAdd)
      adapted.toUpdate.forEach(({ id, score }) => store.updateTermScore(id, score))
    },
  })
  return null
}
