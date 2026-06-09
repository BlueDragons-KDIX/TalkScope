import React, { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { useTermStore } from '../../../stores/termStore'
import type { Term } from '../../../domain/entities/Term'
import { useThrottledValue } from '../../hooks/useThrottledValue'
import { rankTermsByImportance } from '../../utils/importanceRanking'
import type { WindowProps } from '../IWindowDefinition'
import { useContentFontScaleStore } from '../../../stores/contentFontScaleStore'
import { scaledContentFontPx } from '../../../app/utils/contentFontScale'
import { useAccentTheme } from '../../../theme/AccentThemeContext'
import { accentRgba, accentRgbSolid } from '../../../theme/accentStyles'
import { useImportanceRankingWindowSettingsStore } from '../../../stores/importanceRankingWindowSettingsStore'
import { useScoreUpdate } from '../../hooks/useScoreUpdate'

const RANK_THROTTLE_MS = 160
const BASE_ROW_HEIGHT = 66
const BASE_RANK_BADGE_SIZE = 32
const BASE_STAR_ICON_SIZE = 16
const ROW_HEIGHT_PER_FONT = 2.6
const RANK_BADGE_SIZE_PER_FONT = 1.9

export const ImportanceRankingWindow: React.FC<WindowProps> = React.memo(({ darkMode = true }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'starred'>('all')

  const activeTerms = useTermStore(s => s.activeTerms)
  const selectTerm = useTermStore(s => s.selectTerm)
  const addToHistory = useTermStore(s => s.addToHistory)
  const pinnedTermIds = useTermStore(s => s.pinnedTermIds)
  const togglePin = useTermStore(s => s.togglePin)
  const { onClick: onScoreClick } = useScoreUpdate()

  const contentFontScale = useContentFontScaleStore(s => s.scale)
  const masterSizeScale = useImportanceRankingWindowSettingsStore(s => s.masterSizeScale)
  const rankingFontSizePx = useImportanceRankingWindowSettingsStore(s => s.fontSizePx)
  const visibleCount = useImportanceRankingWindowSettingsStore(s => s.visibleCount)
  const { rgb } = useAccentTheme()

  const throttledTerms = useThrottledValue(activeTerms as Term[], RANK_THROTTLE_MS)
  const wordFontSize = scaledContentFontPx(rankingFontSizePx, contentFontScale)
  const rowHeight = Math.round(Math.max(
    BASE_ROW_HEIGHT * masterSizeScale,
    wordFontSize * ROW_HEIGHT_PER_FONT,
  ))
  const rankBadgeSize = Math.round(Math.max(
    BASE_RANK_BADGE_SIZE * masterSizeScale,
    wordFontSize * RANK_BADGE_SIZE_PER_FONT,
  ))
  const starIconSize = Math.round(BASE_STAR_ICON_SIZE * masterSizeScale)

  const ranked = useMemo(
    () => rankTermsByImportance(throttledTerms),
    [throttledTerms],
  )

  const filteredRanked = useMemo(() => {
    if (filterMode === 'all') return ranked
    return ranked.filter(row => pinnedTermIds.has(row.term.id))
  }, [filterMode, ranked, pinnedTermIds])
  const visibleRanked = filteredRanked.slice(0, visibleCount)

  const maxVisibleScore = filteredRanked[0]?.score ?? 1
  const dk = darkMode

  const onTermClick = (term: Term) => {
    selectTerm(term)
    addToHistory(term)
    onScoreClick(term.id)
  }

  const onTermContextMenu = (event: React.MouseEvent, termId: string) => {
    event.preventDefault()
    togglePin(termId)
  }

  return (
    <div
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
                    ? ''
                    : dk ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={
                  filterMode === 'all'
                    ? {
                        backgroundColor: accentRgba(rgb, dk ? 0.32 : 0.14),
                        color: accentRgba(rgb, dk ? 0.96 : 0.88),
                      }
                    : undefined
                }
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
            <span className={`text-[10px] font-mono ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              {visibleRanked.length}/{filteredRanked.length}
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
              {visibleRanked.map((row, index) => (
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
                      <Star size={starIconSize} fill={pinnedTermIds.has(row.term.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTermClick(row.term)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <span
                        className="shrink-0 rounded-full border text-center font-black"
                        style={
                          dk
                            ? {
                                width: rankBadgeSize,
                                height: rankBadgeSize,
                                lineHeight: `${Math.max(1, rankBadgeSize - 2)}px`,
                                fontSize: wordFontSize,
                                color: accentRgba(rgb, 0.96),
                                borderColor: accentRgba(rgb, 0.55),
                                background: `linear-gradient(to bottom, ${accentRgba(rgb, 0.75)}, ${accentRgba(rgb, 0.45)})`,
                                boxShadow: `0 0 14px ${accentRgba(rgb, 0.4)}`,
                              }
                            : {
                                width: rankBadgeSize,
                                height: rankBadgeSize,
                                lineHeight: `${Math.max(1, rankBadgeSize - 2)}px`,
                                fontSize: wordFontSize,
                                color: accentRgba(rgb, 0.95),
                                borderColor: accentRgba(rgb, 0.4),
                                background: `linear-gradient(to bottom, ${accentRgba(rgb, 0.18)}, ${accentRgba(rgb, 0.32)})`,
                                boxShadow: `0 1px 8px ${accentRgba(rgb, 0.22)}`,
                              }
                        }
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
                        <span className={`mt-1 block h-1.5 w-full rounded-full ${dk ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <span
                            className="block h-1.5 rounded-full"
                            style={{
                              width: `${Math.max(8, Math.min(100, (row.score / maxVisibleScore) * 100))}%`,
                              backgroundColor: accentRgbSolid(rgb),
                            }}
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
