import type React from 'react'
import { useEffect, useRef } from 'react'
import { useReferDictScoreSse } from '../hooks/useReferDictScoreSse'
import { useTermStore } from '../../stores/termStore'
import { useBubbleStore } from '../../stores/bubbleStore'
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

  const syncBubbleDebugTerms = () => {
    const visibleSet = new Set(useBubbleStore.getState().visibleTermIds)
    const bubbleTerms = useTermStore.getState().activeTerms.filter((term) => visibleSet.has(term.id))
    usePipelineDebugStore.getState().setBubbleTerms(bubbleTerms)
    return bubbleTerms
  }

  useEffect(() => {
    const pushBubbleLog = (bubbleTerms: ReturnType<typeof syncBubbleDebugTerms>) => {
      if (bubbleTerms.length === 0) return
      const labels = bubbleTerms.slice(0, 4).map((term) => term.word).join(' / ')
      useTriggerTimelineStore.getState().appendLog({
        type: 'bubbleCreated',
        summary: `${bubbleTerms.length}件のバブルを表示`,
        detail: labels
          ? `生成対象: ${labels}${bubbleTerms.length > 4 ? ' ...' : ''}`
          : 'バブル表示対象を更新しました。',
      })
    }

    let prevBubbleSignature = ''
    const onBubbleVisibilityChange = () => {
      const bubbleTerms = syncBubbleDebugTerms()
      const signature = bubbleTerms.map((term) => `${term.id}:${term.score.toFixed(4)}`).join('|')
      if (signature === prevBubbleSignature) return
      prevBubbleSignature = signature
      if (bubbleTerms.length > 0) pushBubbleLog(bubbleTerms)
    }

    const unsubTerms = useTermStore.subscribe(onBubbleVisibilityChange)
    const unsubBubble = useBubbleStore.subscribe(onBubbleVisibilityChange)
    return () => {
      unsubTerms()
      unsubBubble()
    }
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
      const bubbleStore = useBubbleStore.getState()
      adapted.toAdd.forEach((term) => {
        bubbleStore.addVisibleTermId(term.id)
      })
    },
  })
  return null
}
