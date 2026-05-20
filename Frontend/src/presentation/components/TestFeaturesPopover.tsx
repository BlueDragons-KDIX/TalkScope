import React, { useMemo, useState } from 'react'
import {
  FlaskConical,
  Play,
  FastForward,
  Pause,
  LoaderCircle,
  Square,
  Highlighter,
  Clipboard,
  ClipboardCheck,
  FileJson,
} from 'lucide-react'
import { toast } from 'sonner'
import { DEMO_TEXT_INSTANT } from '../../debug/demo/demo'
import { useDemoTools } from '../context/DemoToolsContext'
import { getTranscriptionService } from '../hooks/useTranscription'
import { useDemoImportantMarkingStore } from '../../stores/demoImportantMarkingStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { usePhaseStore } from '../../stores/phaseStore'
import { useAccentTheme } from '../../theme/AccentThemeContext'
import { accentRgbSolid, accentSliderStyle } from '../../theme/accentStyles'

interface Props {
  darkMode?: boolean
  /** ポップオーバーをトリガーに対して左寄せ / 右寄せ */
  align?: 'left' | 'right'
}

/** ms→スライダー位置（TranscriptionView と同じカーブ） */
function msToPos(ms: number): number {
  return Math.round(((5000 - ms) / (5000 - 60)) * 100)
}

function posToMs(pos: number): number {
  return Math.round(5000 - (pos / 100) * (5000 - 60))
}

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')

const formatLayoutTemplate = (phaseId: string, layoutJson: string): string =>
  `create${toPascalCase(phaseId)}SampleLayout(): LayoutNode {
  return ${layoutJson}
}`

export const TestFeaturesPopover: React.FC<Props> = ({ darkMode = true, align = 'right' }) => {
  const [open, setOpen] = useState(false)
  const [layoutCopied, setLayoutCopied] = useState(false)
  const demoStream = useDemoTools()
  const demoMarkingEnabled = useDemoImportantMarkingStore(s => s.enabled)
  const setDemoMarkingEnabled = useDemoImportantMarkingStore(s => s.setEnabled)
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const currentLayout = useLayoutStore(s => s.layouts[currentPhaseId])
  const { rgb } = useAccentTheme()
  const dk = darkMode

  const isStreaming = demoStream.status === 'playing'
  const isPaused = demoStream.status === 'paused'
  const isDone = demoStream.status === 'done'
  const progress = demoStream.progress
  const pos = msToPos(demoStream.intervalMs)
  const layoutJson = useMemo(
    () => currentLayout ? JSON.stringify(currentLayout, null, 2) : '',
    [currentLayout],
  )
  const layoutTemplate = useMemo(
    () => layoutJson ? formatLayoutTemplate(currentPhaseId, layoutJson) : '',
    [currentPhaseId, layoutJson],
  )

  const loadDemoText = () => {
    const svc = getTranscriptionService()
    svc.stopListening()
    demoStream.stopStream()
    svc.setTranscriptExternal(DEMO_TEXT_INSTANT)
    toast.success('デモテキストを読み込みました')
  }

  const runLiveDemo = () => {
    getTranscriptionService().stopListening()
    demoStream.startStream()
  }

  const stopDemo = () => {
    demoStream.stopStream()
    toast.info('ライブデモを停止しました')
  }

  const copyLayoutTemplate = async () => {
    if (!layoutTemplate) {
      toast.warning('コピーできるレイアウトがありません')
      return
    }

    try {
      await navigator.clipboard.writeText(layoutTemplate)
      setLayoutCopied(true)
      toast.success('現在のレイアウトをコピーしました')
      window.setTimeout(() => setLayoutCopied(false), 1600)
    } catch {
      toast.error('クリップボードへのコピーに失敗しました')
    }
  }

  const panelPos = align === 'left' ? 'left-0 right-auto' : 'right-0 left-auto'
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2'
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="開発者向けテスト（デモ・検証）"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${dk
          ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="開発者向けテストを開く"
      >
        <FlaskConical size={17} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute ${panelPos} top-full mt-1 z-[70] w-[min(92vw,420px)] rounded-xl border shadow-2xl p-3 ${dk
              ? 'bg-[#0d0e1a] border-slate-700'
              : 'bg-white border-slate-200'}`}
            role="dialog"
            aria-label="テスト機能"
          >
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                デモ・検証
              </p>

              <div className="flex flex-col gap-2">
                <div
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 mb-1 ${dk ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}
                >
                  <Highlighter size={14} className={`shrink-0 mt-0.5 ${dk ? 'text-amber-400' : 'text-amber-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold leading-tight ${dk ? 'text-slate-200' : 'text-slate-800'}`}>
                        デモ重要単語マーキング
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={demoMarkingEnabled}
                        onClick={() => setDemoMarkingEnabled(!demoMarkingEnabled)}
                        className={`w-10 h-5 rounded-full shrink-0 relative transition-colors ${demoMarkingEnabled ? '' : dk ? 'bg-slate-600' : 'bg-slate-200'}`}
                        style={demoMarkingEnabled ? { backgroundColor: accentRgbSolid(rgb) } : undefined}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${demoMarkingEnabled ? 'left-[22px]' : 'left-0.5'}`}
                        />
                      </button>
                    </div>
                    <p className={`text-[10px] mt-1 leading-snug ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
                      ON でコード内のモック語リストに一致する語をハイライトし、バブルに載せます（サーバー未接続時の検証用）。
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadDemoText}
                  className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${dk
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-600'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                >
                  <Play size={14} />
                  デモテキストを読み込む
                </button>

                {!isStreaming && !isPaused && (
                  <button
                    type="button"
                    onClick={runLiveDemo}
                    className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${dk
                      ? 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border-purple-500/35'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'}`}
                  >
                    <FastForward size={14} />
                    ライブデモを開始
                  </button>
                )}

                {isStreaming && (
                  <button
                    type="button"
                    onClick={() => demoStream.pauseStream()}
                    className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${dk
                      ? 'bg-purple-600/25 text-purple-200 border-purple-500/40'
                      : 'bg-purple-100 text-purple-800 border-purple-200'}`}
                  >
                    <Pause size={14} />
                    一時停止（{progress}%）
                  </button>
                )}

                {isPaused && (
                  <button
                    type="button"
                    onClick={() => demoStream.startStream()}
                    className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${dk
                      ? 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border-purple-500/35'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'}`}
                  >
                    <LoaderCircle size={14} />
                    再開（{progress}%）
                  </button>
                )}

                {(isStreaming || isPaused || isDone) && (
                  <button
                    type="button"
                    onClick={stopDemo}
                    className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${dk
                      ? 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 border-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}
                  >
                    <Square size={14} />
                    ライブデモをリセット
                  </button>
                )}

                <div
                  className={`rounded-lg border p-2.5 ${dk ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileJson size={14} className={`mt-0.5 shrink-0 ${dk ? 'text-cyan-300' : 'text-cyan-700'}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-bold leading-tight ${dk ? 'text-slate-200' : 'text-slate-800'}`}>
                          現在のレイアウト
                        </p>
                        <p className={`mt-1 text-[10px] leading-snug ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
                          `{currentPhaseId}` フェーズの状態をクラスに貼れるメソッド形式で表示します。
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyLayoutTemplate}
                      disabled={!layoutTemplate}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${dk
                        ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/18'
                        : 'border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50'}`}
                    >
                      {layoutCopied ? <ClipboardCheck size={12} /> : <Clipboard size={12} />}
                      {layoutCopied ? 'コピー済み' : 'コピー'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={layoutTemplate || '現在のフェーズにはまだレイアウトがありません。'}
                    className={`h-32 w-full resize-y rounded-md border p-2 font-mono text-[10px] leading-relaxed outline-none ${dk
                      ? 'border-slate-700 bg-[#080914] text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700'}`}
                    aria-label="現在のレイアウト情報"
                  />
                </div>

                <div className={`pt-2 mt-1 border-t ${dk ? 'border-slate-700/80' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>再生速度</span>
                    <span className={`text-[9px] font-mono font-bold ${isStreaming ? 'text-purple-400' : dk ? 'text-slate-500' : 'text-slate-400'}`}>
                      {demoStream.intervalMs >= 2000 ? '超遅'
                        : demoStream.intervalMs >= 400 ? '遅'
                          : demoStream.intervalMs >= 250 ? '普通'
                            : demoStream.intervalMs >= 130 ? '速い'
                              : '超速'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pos}
                    onChange={e => demoStream.setIntervalMs(posToMs(Number(e.target.value)))}
                    className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isStreaming ? 'accent-purple-500' : ''}`}
                    style={{
                      background: dk ? '#1e293b' : '#e2e8f0',
                      ...(isStreaming ? {} : accentSliderStyle(rgb)),
                    }}
                  />
                </div>
              </div>
          </div>
        </>
      )}
    </div>
  )
}
