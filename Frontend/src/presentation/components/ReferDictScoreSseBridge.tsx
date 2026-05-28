import type React from 'react'
import { useReferDictScoreSse } from '../hooks/useReferDictScoreSse'
import { useTermStore } from '../../stores/termStore'
import { filterByScore } from '../../infrastructure/adapters/ScoreThresholdFilter'

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
  useReferDictScoreSse({
    onTerms: (terms) => {
      const filtered = filterByScore(terms, scoreThreshold)
      useTermStore.getState().addTerms(filtered)
    },
  })
  return null
}
