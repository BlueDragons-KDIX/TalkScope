import type React from 'react'
import { useReferDictScoreSse } from '../hooks/useReferDictScoreSse'

/**
 * App ルートに置く配線用（UI なし）。
 * 既定では SSE のみ開く。termStore へ載せる場合は `onTerms` を渡す。
 */
export const ReferDictScoreSseBridge: React.FC = () => {
  useReferDictScoreSse()
  return null
}
