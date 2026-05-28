import type React from 'react'
import { useEffect, useRef } from 'react'
import { useReferDictScoreSse } from '../hooks/useReferDictScoreSse'
import { useTermStore } from '../../stores/termStore'
import {
  DEFAULT_SCORE_THRESHOLD,
  partitionByScore,
} from '../../infrastructure/adapters/ScoreThresholdFilter'
import { defaultScoreUpdateStrategy } from '../../infrastructure/adapters/DefaultScoreUpdateStrategy'
import { FrequencyScoreAdapter } from '../../infrastructure/adapters/FrequencyScoreAdapter'
import { usePipelineDebugStore } from '../../stores/pipelineDebugStore'

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
  const threshold = scoreThreshold ?? DEFAULT_SCORE_THRESHOLD
  const adapterRef = useRef<FrequencyScoreAdapter | null>(null)
  if (!adapterRef.current) {
    adapterRef.current = new FrequencyScoreAdapter(defaultScoreUpdateStrategy)
  }

  useEffect(() => {
    const unsub = useTermStore.subscribe((state) => {
      usePipelineDebugStore.getState().setBubbleTerms(state.activeTerms)
    })
    return unsub
  }, [])

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
    onRequestOpened: (text) => {
      usePipelineDebugStore.getState().pushSentInput(text)
    },
    onChunk: (rows) => {
      usePipelineDebugStore.getState().pushSseRows(rows)
    },
    onTerms: (terms) => {
      const { passed, rejected } = partitionByScore(terms, threshold)
      usePipelineDebugStore.getState().setFilteredTerms(threshold, passed, rejected)
      const adapted = adapterRef.current?.adapt(passed)
      if (!adapted) return
      const store = useTermStore.getState()
      store.addTerms(adapted.toAdd)
      adapted.toUpdate.forEach(({ id, score }) => store.updateTermScore(id, score))
    },
  })
  return null
}
