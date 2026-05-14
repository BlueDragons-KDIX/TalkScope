import React from 'react'
import { RotateCcw, Settings, RefreshCw } from 'lucide-react'
import { LayoutPresetMenu } from '../../components/LayoutPresetMenu'
import { TestFeaturesPopover } from '../../components/TestFeaturesPopover'
import { PhaseTransitionButton } from '../../components/PhaseTransitionButton'
import { RecordingToolbar } from '../../components/RecordingToolbar'
import { usePresentationShell } from '../../context/PresentationShellContext'
import { useTranscription } from '../../hooks/useTranscription'
import { usePhaseStore } from '../../../stores/phaseStore'
import type { WindowProps } from '../IWindowDefinition'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2'

export const SystemControlWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const { onOpenAppearance, onResetAll } = usePresentationShell()
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const isDuring = currentPhaseId === 'during'
  const dk = darkMode
  const ringOffset = dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'

  const {
    isListening,
    mode,
    startListening,
    stopListening,
    setMode,
    microphones,
    selectedMicrophoneId,
    refreshMicrophones,
    selectMicrophone,
  } = useTranscription()

  const handleToggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const settingsBtn = dk
    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

  const resetBtn = dk
    ? 'border border-amber-500/45 bg-amber-500/12 text-amber-300 hover:bg-amber-500/22 hover:border-amber-400/60'
    : 'border border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400'

  const reloadBtn = dk
    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

  return (
    <div
      className={`flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 ${dk ? 'bg-[#0d0e1a] text-slate-200' : 'bg-white text-slate-800'}`}
    >
      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
        操作
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-b pb-3 border-slate-700/40">
        <RecordingToolbar
          darkMode={darkMode}
          isListening={isListening}
          onToggleListening={handleToggleListening}
          mode={mode}
          onChangeMode={setMode}
          microphones={microphones}
          selectedMicrophoneId={selectedMicrophoneId}
          onSelectMicrophone={selectMicrophone}
          onRefreshMicrophones={refreshMicrophones}
          compact
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <LayoutPresetMenu darkMode={darkMode} phaseId="during" menuAlign="left" disabled={!isDuring} />
        <button
          type="button"
          onClick={onOpenAppearance}
          title="設定"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${settingsBtn}`}
          aria-haspopup="dialog"
          aria-label="設定を開く"
        >
          <Settings size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          title="アプリを再読み込み"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${reloadBtn}`}
          aria-label="アプリを再読み込み"
        >
          <RefreshCw size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onResetAll}
          title="文字起こし・用語・履歴などをすべてクリアします"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${focusRing} ${ringOffset} ${resetBtn}`}
          aria-label="すべてのウィンドウをリセット"
        >
          <RotateCcw size={18} strokeWidth={2} />
        </button>
      </div>

      {import.meta.env.DEV ? (
        <div className={`flex justify-center border-b pb-3 ${dk ? 'border-slate-700/40' : 'border-slate-200'}`}>
          <TestFeaturesPopover darkMode={darkMode} align="left" />
        </div>
      ) : null}

      <div className="mt-auto flex justify-center pt-1">
        <PhaseTransitionButton darkMode={darkMode} />
      </div>
    </div>
  )
}
