import React from 'react'
import type { WindowProps } from '../IWindowDefinition'
import { usePipelineDebugStore } from '../../../stores/pipelineDebugStore'

const layerLabels = {
  sent: '1) 送信テキスト',
  sse: '2) SSE受信語',
  filtered: '3) フィルター結果',
  bubble: '4) バブル表示語',
} as const

type LayerKey = keyof typeof layerLabels

export const PipelineDebugWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const dk = darkMode
  const sentInputs = usePipelineDebugStore((s) => s.sentInputs)
  const sseTerms = usePipelineDebugStore((s) => s.sseTerms)
  const filteredThreshold = usePipelineDebugStore((s) => s.filteredThreshold)
  const filteredPassedTerms = usePipelineDebugStore((s) => s.filteredPassedTerms)
  const filteredRejectedTerms = usePipelineDebugStore((s) => s.filteredRejectedTerms)
  const bubbleTerms = usePipelineDebugStore((s) => s.bubbleTerms)
  const visibleLayers = usePipelineDebugStore((s) => s.visibleLayers)
  const toggleLayer = usePipelineDebugStore((s) => s.toggleLayer)
  const clearAll = usePipelineDebugStore((s) => s.clearAll)

  const layers: Array<{
    key: LayerKey
    body: React.ReactNode
  }> = [
    {
      key: 'sent',
      body: (
        <div className="flex flex-wrap gap-2">
          {sentInputs.length === 0 ? <span className="text-[11px] opacity-60">まだ送信なし</span> : null}
          {sentInputs.map((text, index) => (
            <span key={`${text}-${index}`} className="rounded border px-2 py-1 text-[11px]">
              {text}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'sse',
      body: (
        <div className="flex flex-wrap gap-2">
          {sseTerms.length === 0 ? <span className="text-[11px] opacity-60">まだ受信なし</span> : null}
          {sseTerms.map((term, index) => (
            <span key={`${term.term}-${index}`} className="rounded border px-2 py-1 text-[11px]">
              {term.term} ({term.score.toFixed(2)})
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'filtered',
      body: (
        <div className="space-y-1">
          <div className="text-[11px] opacity-80">閾値: {filteredThreshold.toFixed(4)}</div>
          <div className="space-y-2">
            <div>
              <div className="mb-1 text-[11px] font-bold text-emerald-400">通過</div>
              <div className="flex flex-wrap gap-2">
                {filteredPassedTerms.length === 0 ? <span className="text-[11px] opacity-60">通過語なし</span> : null}
                {filteredPassedTerms.map((term) => (
                  <span key={`passed-${term.id}`} className="rounded border px-2 py-1 text-[11px]">
                    {term.word} ({term.score.toFixed(4)})
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold text-rose-400">除外</div>
              <div className="flex flex-wrap gap-2">
                {filteredRejectedTerms.length === 0 ? <span className="text-[11px] opacity-60">除外語なし</span> : null}
                {filteredRejectedTerms.map((term) => (
                  <span key={`rejected-${term.id}`} className="rounded border px-2 py-1 text-[11px]">
                    {term.word} ({term.score.toFixed(4)})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'bubble',
      body: (
        <div className="flex flex-wrap gap-2">
          {bubbleTerms.length === 0 ? <span className="text-[11px] opacity-60">表示語なし</span> : null}
          {bubbleTerms.map((term) => (
            <span key={term.id} className="rounded border px-2 py-1 text-[11px]">
              {term.word} ({term.score.toFixed(2)})
            </span>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className={`h-full overflow-auto p-3 ${dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-700'}`}>
      <div className={`mb-3 rounded border p-2 ${dk ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {(Object.keys(layerLabels) as LayerKey[]).map((layer) => (
            <label
              key={layer}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] ${
                visibleLayers[layer]
                  ? (dk ? 'border-emerald-400 text-emerald-300' : 'border-emerald-600 text-emerald-700')
                  : (dk ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500')
              }`}
            >
              <input
                type="checkbox"
                checked={visibleLayers[layer]}
                onChange={() => toggleLayer(layer)}
                className="size-3.5"
              />
              <span>{layerLabels[layer]}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className={`ml-auto rounded border px-2 py-1 text-[11px] ${dk ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}
          >
            ログをクリア
          </button>
        </div>
        <p className={`text-[11px] ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
          テスト用可視化ウィンドウです。SSEの処理パイプラインを段階ごとに確認できます。
        </p>
      </div>

      <div className="space-y-3">
        {layers
          .filter((layer) => visibleLayers[layer.key])
          .map((layer) => (
            <section key={layer.key} className={`rounded border p-2 ${dk ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50/70'}`}>
              <h3 className="mb-2 text-xs font-bold">{layerLabels[layer.key]}</h3>
              {layer.body}
            </section>
          ))}
      </div>
    </div>
  )
}
