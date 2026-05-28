import React, { useCallback, useMemo } from 'react'
import type { WindowProps } from '../IWindowDefinition'
import { toast } from 'sonner'
import {
  useTriggerTimelineStore,
  type TriggerTimelineEntry,
  type TriggerTimelineType,
} from '../../../stores/triggerTimelineStore'

const typeLabels: Record<TriggerTimelineType, string> = {
  transcriptFinalized: '1) 文字起こし確定',
  sentToServer: '2) サーバー送信',
  sseReceived: '3) SSE受信',
  filtered: '4) フィルタリング完了',
  bubbleCreated: '5) バブル生成',
}

const orderedTypes: TriggerTimelineType[] = [
  'transcriptFinalized',
  'sentToServer',
  'sseReceived',
  'filtered',
  'bubbleCreated',
]

function formatOccurredAt(value: number): string {
  const date = new Date(value)
  const base = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${base}.${ms}`
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|')
}

function buildTypeMarkdown(type: TriggerTimelineType, entries: TriggerTimelineEntry[]): string {
  const lines = [
    `## ${typeLabels[type]} (${entries.length})`,
    '',
  ]
  if (entries.length === 0) {
    lines.push('- 記録なし')
  } else {
    for (const entry of entries) {
      lines.push(`- **${formatOccurredAt(entry.occurredAt)}** ${escapeMarkdown(entry.summary)}`)
      lines.push(`  - ${escapeMarkdown(entry.detail)}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

export const TriggerTimelineWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const dk = darkMode
  const logs = useTriggerTimelineStore((s) => s.logs)
  const visibleTypes = useTriggerTimelineStore((s) => s.visibleTypes)
  const toggleType = useTriggerTimelineStore((s) => s.toggleType)
  const clearLogs = useTriggerTimelineStore((s) => s.clearLogs)

  const logsByType = useMemo(() => {
    const grouped: Record<TriggerTimelineType, TriggerTimelineEntry[]> = {
      transcriptFinalized: [],
      sentToServer: [],
      sseReceived: [],
      filtered: [],
      bubbleCreated: [],
    }
    for (const entry of logs) {
      grouped[entry.type].push(entry)
    }
    for (const key of Object.keys(grouped) as TriggerTimelineType[]) {
      grouped[key].sort((a, b) => b.occurredAt - a.occurredAt)
    }
    return grouped
  }, [logs])

  const copyMarkdown = useCallback(async (content: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(successMessage)
    } catch {
      toast.error('コピーに失敗しました')
    }
  }, [])

  const copyAllVisibleAsMarkdown = useCallback(() => {
    const visibleOrderedTypes = orderedTypes.filter((type) => visibleTypes[type])
    const sections = visibleOrderedTypes.map((type) => buildTypeMarkdown(type, logsByType[type]))
    const markdown = [
      '# 時系列トリガーログ',
      '',
      `- 出力時刻: ${new Date().toISOString()}`,
      '',
      ...sections,
    ].join('\n')
    void copyMarkdown(markdown, '表示中の項目をMarkdownでコピーしました')
  }, [copyMarkdown, logsByType, visibleTypes])

  const copySingleTypeAsMarkdown = useCallback((type: TriggerTimelineType) => {
    const markdown = [
      '# 時系列トリガーログ',
      '',
      buildTypeMarkdown(type, logsByType[type]),
    ].join('\n')
    void copyMarkdown(markdown, `「${typeLabels[type]}」をMarkdownでコピーしました`)
  }, [copyMarkdown, logsByType])

  return (
    <div className={`h-full overflow-auto p-3 ${dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-700'}`}>
      <div className={`mb-3 rounded border p-2 ${dk ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {orderedTypes.map((type) => (
            <label
              key={type}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] ${
                visibleTypes[type]
                  ? (dk ? 'border-emerald-400 text-emerald-300' : 'border-emerald-600 text-emerald-700')
                  : (dk ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500')
              }`}
            >
              <input
                type="checkbox"
                checked={visibleTypes[type]}
                onChange={() => toggleType(type)}
                className="size-3.5"
              />
              <span>{typeLabels[type]}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={copyAllVisibleAsMarkdown}
            className={`rounded border px-2 py-1 text-[11px] ${dk ? 'border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/10' : 'border-cyan-300 text-cyan-700 hover:bg-cyan-50'}`}
          >
            表示中をMarkdownコピー
          </button>
          <button
            type="button"
            onClick={clearLogs}
            className={`rounded border px-2 py-1 text-[11px] ${dk ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}
          >
            ログをクリア
          </button>
        </div>
        <p className={`text-[11px] ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
          UIボタン以外のトリガーを時系列で記録します。イベントごとに「何が・いつ・どうなったか」を確認できます。
        </p>
      </div>

      <div className="space-y-3">
        {orderedTypes
          .filter((type) => visibleTypes[type])
          .map((type) => {
            const entries = logsByType[type]
            return (
              <section key={type} className={`rounded border p-2 ${dk ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold">
                    {typeLabels[type]} ({entries.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => copySingleTypeAsMarkdown(type)}
                    className={`rounded border px-2 py-1 text-[11px] ${dk ? 'border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10' : 'border-cyan-300 text-cyan-700 hover:bg-cyan-50'}`}
                  >
                    この項目をコピー
                  </button>
                </div>
                {entries.length === 0 ? (
                  <p className="text-[11px] opacity-60">まだ記録がありません</p>
                ) : (
                  <ul className="space-y-2">
                    {entries.map((entry) => (
                      <li key={entry.id} className={`rounded border px-2 py-1.5 text-[11px] ${dk ? 'border-slate-700/80 bg-slate-950/35' : 'border-slate-200 bg-white/90'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{entry.summary}</span>
                          <time className={`shrink-0 font-mono ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatOccurredAt(entry.occurredAt)}
                          </time>
                        </div>
                        <p className={`mt-1 leading-snug ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{entry.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
      </div>
    </div>
  )
}
