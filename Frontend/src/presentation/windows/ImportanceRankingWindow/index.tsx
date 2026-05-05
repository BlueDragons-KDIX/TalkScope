import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useTermStore } from '../../../stores/termStore'
import { useTranscriptStore } from '../../../stores/transcriptStore'
import type { Term } from '../../../domain/entities/Term'
import { countTermFrequencies } from '../../../app/utils/termDetection'
import { useThrottledValue } from '../../hooks/useThrottledValue'
import {
  estimateVisibleRankingCount,
  rankTermsByImportance,
  type RankingSignal,
} from '../../utils/importanceRanking'
import type { WindowProps } from '../IWindowDefinition'

const ROW_HEIGHT = 46
const RANK_THROTTLE_MS = 160

export const ImportanceRankingWindow: React.FC<WindowProps> = React.memo(({ darkMode = true }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(6)

  const transcript = useTranscriptStore(s => s.transcript)
  const activeTerms = useTermStore(s => s.activeTerms)
  const termClickWeights = useTermStore(s => s.termClickWeights)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const incrementClickWeight = useTermStore(s => s.incrementClickWeight)

  const throttledTranscript = useThrottledValue(transcript, RANK_THROTTLE_MS)
  const throttledTerms = useThrottledValue(activeTerms as Term[], RANK_THROTTLE_MS)
  const throttledWeights = useThrottledValue(termClickWeights, RANK_THROTTLE_MS)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0
      setVisibleCount(estimateVisibleRankingCount(height, ROW_HEIGHT))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const termFrequencies = useMemo(
    () => countTermFrequencies(throttledTranscript, throttledTerms),
    [throttledTranscript, throttledTerms],
  )

  const ranked = useMemo(() => {
    const signals: Record<string, RankingSignal> = {}
    for (const term of throttledTerms) {
      signals[term.id] = {
        frequency: termFrequencies[term.id] ?? 0,
        clickWeight: throttledWeights[term.id] ?? 0,
      }
    }
    return rankTermsByImportance(throttledTerms, signals)
  }, [throttledTerms, termFrequencies, throttledWeights])

  const visible = ranked.slice(0, visibleCount)
  const dk = darkMode

  const onTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
    incrementClickWeight(term.id)
  }

  return (
    <div
      ref={containerRef}
      className={`h-full p-3 overflow-hidden ${dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-700'}`}
    >
      <div className={`h-full rounded-lg border flex flex-col ${dk ? 'border-slate-700/70 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'}`}>
        <div className={`h-11 px-3 flex items-center justify-between border-b ${dk ? 'border-slate-700/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className={dk ? 'text-indigo-300' : 'text-indigo-600'} />
            <span className="text-xs font-bold">重要度ランキング</span>
          </div>
          <span className={`text-[10px] font-mono ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
            {visible.length}/{ranked.length}
          </span>
        </div>

        <div className="flex-1 overflow-hidden px-2 py-1.5">
          {visible.length === 0 ? (
            <div className={`h-full flex items-center justify-center text-xs ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              用語がまだありません
            </div>
          ) : (
            <ol className="flex flex-col gap-1">
              {visible.map((row, index) => (
                <li key={row.term.id}>
                  <button
                    type="button"
                    onClick={() => onTermClick(row.term)}
                    className={`w-full h-[46px] rounded-md px-2 text-left border transition-colors flex items-center gap-2 ${
                      dk
                        ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className={`w-6 text-center text-[11px] font-black ${dk ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      {index + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-xs font-bold">{row.term.word}</span>
                    <span className={`text-[10px] font-mono ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                      {row.score.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
})

ImportanceRankingWindow.displayName = 'ImportanceRankingWindow'
