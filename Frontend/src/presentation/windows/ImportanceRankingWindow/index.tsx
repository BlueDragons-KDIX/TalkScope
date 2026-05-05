import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Star } from 'lucide-react'
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

const RANK_THROTTLE_MS = 160
const MIN_ROW_HEIGHT = 50
const MAX_ROW_HEIGHT = 86

export const ImportanceRankingWindow: React.FC<WindowProps> = React.memo(({ darkMode = true }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(6)
  const [filterMode, setFilterMode] = useState<'all' | 'starred'>('all')
  const [rowSizeSlider, setRowSizeSlider] = useState(45)

  const transcript = useTranscriptStore(s => s.transcript)
  const activeTerms = useTermStore(s => s.activeTerms)
  const termClickWeights = useTermStore(s => s.termClickWeights)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const pinnedTermIds = useTermStore(s => s.pinnedTermIds)
  const togglePin = useTermStore(s => s.togglePin)

  const throttledTranscript = useThrottledValue(transcript, RANK_THROTTLE_MS)
  const throttledTerms = useThrottledValue(activeTerms as Term[], RANK_THROTTLE_MS)
  const throttledWeights = useThrottledValue(termClickWeights, RANK_THROTTLE_MS)
  const rowHeight = Math.round(
    MIN_ROW_HEIGHT + (rowSizeSlider / 100) * (MAX_ROW_HEIGHT - MIN_ROW_HEIGHT),
  )
  const wordFontSize = Math.round(15 + (rowSizeSlider / 100) * 12)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0
      setVisibleCount(estimateVisibleRankingCount(height, rowHeight))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [rowHeight])

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

  const filteredRanked = useMemo(() => {
    if (filterMode === 'all') return ranked
    return ranked.filter(row => pinnedTermIds.has(row.term.id))
  }, [filterMode, ranked, pinnedTermIds])

  const maxVisibleScore = filteredRanked[0]?.score ?? 1
  const dk = darkMode

  const onTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
  }

  const onTermContextMenu = (event: React.MouseEvent, termId: string) => {
    event.preventDefault()
    togglePin(termId)
  }

  return (
    <div
      ref={containerRef}
      className={`h-full p-3 overflow-hidden ${dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-700'}`}
    >
      <div className={`h-full rounded-lg border flex flex-col ${dk ? 'border-slate-700/70 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'}`}>
        <div className={`h-12 px-3 flex items-center gap-3 border-b ${dk ? 'border-slate-700/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`rounded-md p-0.5 border ${dk ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'}`}>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  filterMode === 'all'
                    ? dk ? 'bg-indigo-500/30 text-indigo-200' : 'bg-indigo-100 text-indigo-700'
                    : dk ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                重要度順
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('starred')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  filterMode === 'starred'
                    ? dk ? 'bg-yellow-500/25 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                    : dk ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                スターのみ
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className={`text-[10px] font-bold shrink-0 ${dk ? 'text-slate-500' : 'text-slate-500'}`}>要素サイズ</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={rowSizeSlider}
              onChange={(e) => setRowSizeSlider(Number(e.target.value))}
              className={`w-28 h-1.5 rounded-full appearance-none cursor-pointer ${dk ? 'accent-cyan-400' : 'accent-cyan-600'}`}
              style={{ background: dk ? '#334155' : '#cbd5e1' }}
              title={`要素サイズ: ${rowSizeSlider}`}
            />
            <span className={`text-[10px] font-mono ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              {Math.min(visibleCount, filteredRanked.length)}/{filteredRanked.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1.5">
          {filteredRanked.length === 0 ? (
            <div className={`h-full flex items-center justify-center text-xs ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              {filterMode === 'starred' ? 'スター付き用語がありません' : '用語がまだありません'}
            </div>
          ) : (
            <ol className="flex flex-col gap-1">
              {filteredRanked.map((row, index) => (
                <li key={row.term.id}>
                  <div
                    onContextMenu={(event) => onTermContextMenu(event, row.term.id)}
                    className={`w-full rounded-lg px-2.5 border transition-colors flex items-center gap-2 ${
                      dk
                        ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                    style={{ height: rowHeight }}
                    title="右クリックでスターを切り替え"
                  >
                    <button
                      type="button"
                      onClick={() => togglePin(row.term.id)}
                      className={`p-1 rounded transition-colors ${
                        pinnedTermIds.has(row.term.id)
                          ? 'text-yellow-400'
                          : dk
                            ? 'text-slate-500 hover:text-slate-300'
                            : 'text-slate-400 hover:text-slate-600'
                      }`}
                      aria-label="スターを切り替え"
                      title="スターを切り替え"
                    >
                      <Star size={16} fill={pinnedTermIds.has(row.term.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTermClick(row.term)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <span
                        className={`w-8 h-8 shrink-0 rounded-full border text-center text-[12px] font-black leading-[30px] ${
                          dk
                            ? 'text-indigo-100 border-indigo-300/70 bg-gradient-to-b from-indigo-500/80 to-indigo-700/80 shadow-[0_0_12px_rgba(99,102,241,0.45)]'
                            : 'text-indigo-800 border-indigo-300 bg-gradient-to-b from-indigo-100 to-indigo-200 shadow-[0_1px_6px_rgba(79,70,229,0.22)]'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className="block truncate font-black leading-tight"
                          style={{ fontSize: `${wordFontSize}px` }}
                        >
                          {row.term.word}
                        </span>
                        <span className={`block text-[10px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                          Lv.{row.term.level} / {row.term.category}
                        </span>
                        <span className={`mt-1 block h-1.5 w-full rounded-full ${dk ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <span
                            className={`block h-1.5 rounded-full ${dk ? 'bg-indigo-400' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.max(8, Math.min(100, (row.score / maxVisibleScore) * 100))}%` }}
                          />
                        </span>
                      </span>
                      <span className={`w-12 text-right text-[10px] font-mono ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                        {row.score.toFixed(2)}
                      </span>
                    </button>
                  </div>
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
