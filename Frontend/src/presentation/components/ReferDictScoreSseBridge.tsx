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
import { useTriggerTimelineStore } from '../../stores/triggerTimelineStore'

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
    const unsub = useTermStore.subscribe((state, prev) => {
      usePipelineDebugStore.getState().setBubbleTerms(state.activeTerms)
      const currentSignature = state.activeTerms.map((term) => `${term.id}:${term.score.toFixed(4)}`).join('|')
      const prevSignature = prev.activeTerms.map((term) => `${term.id}:${term.score.toFixed(4)}`).join('|')
      if (state.activeTerms.length === 0 || currentSignature === prevSignature) return
      const labels = state.activeTerms.slice(0, 4).map((term) => term.word).join(' / ')
      useTriggerTimelineStore.getState().appendLog({
        type: 'bubbleCreated',
        summary: `${state.activeTerms.length}件のバブルを表示`,
        detail: labels
          ? `生成対象: ${labels}${state.activeTerms.length > 4 ? ' ...' : ''}`
          : 'バブル表示対象を更新しました。',
      })
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
    onBeforeSend: (text) => {
      useTriggerTimelineStore.getState().appendLog({
        type: 'transcriptFinalized',
        summary: '文字起こし文を確定',
        detail: text,
      })
    },
    onRequestOpened: (text) => {
      usePipelineDebugStore.getState().pushSentInput(text)
      useTriggerTimelineStore.getState().appendLog({
        type: 'sentToServer',
        summary: '確定文をサーバーへ送信',
        detail: text,
      })
    },
    onChunk: (rows) => {
      usePipelineDebugStore.getState().pushSseRows(rows)
      const preview = rows.slice(0, 4).map((row) => `${row.term}(${row.score.toFixed(2)})`).join(' / ')
      useTriggerTimelineStore.getState().appendLog({
        type: 'sseReceived',
        summary: `SSEで${rows.length}件を受信`,
        detail: preview || '受信データのプレビューなし',
      })
    },
    onTerms: (terms) => {
      const { passed, rejected } = partitionByScore(terms, threshold)
      usePipelineDebugStore.getState().setFilteredTerms(threshold, passed, rejected)
      useTriggerTimelineStore.getState().appendLog({
        type: 'filtered',
        summary: `フィルタ完了（通過${passed.length} / 除外${rejected.length}）`,
        detail: `閾値 ${threshold.toFixed(4)} で評価`,
      })
      const adapted = adapterRef.current?.adapt(passed)
      if (!adapted) return
      const store = useTermStore.getState()
      store.addTerms(adapted.toAdd)
      adapted.toUpdate.forEach(({ id, score }) => store.updateTermScore(id, score))
    },
  })
  return null
}
