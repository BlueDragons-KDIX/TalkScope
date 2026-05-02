import React, { useCallback, useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { Palette, RotateCcw } from 'lucide-react'
import { DuringPresentation } from './phases/DuringPresentation'
import { AfterPresentation } from './phases/AfterPresentation'
import { usePhaseStore } from '../stores/phaseStore'
import { registerAllWindows } from './windows'
import { PhaseTransitionButton } from './components/PhaseTransitionButton'
import { LayoutPresetMenu } from './components/LayoutPresetMenu'
import { TestFeaturesPopover } from './components/TestFeaturesPopover'
import { DemoToolsProvider } from './context/DemoToolsContext'
import { useDemoStream } from '../debug/hooks/useDemoStream'
import { getTranscriptionService } from './hooks/useTranscription'
import { SettingsModal } from '../app/components/SettingsModal'
import { useDemoImportantTermsSync } from './hooks/useDemoImportantTermsSync'
import { useTranscriptStore } from '../stores/transcriptStore'
import { useTermStore } from '../stores/termStore'
import { useBubbleStore } from '../stores/bubbleStore'

// ウィンドウを一度だけ登録
let _registered = false
if (!_registered) {
  registerAllWindows()
  _registered = true
}

const DemoImportantTermsBridge: React.FC = () => {
  useDemoImportantTermsSync()
  return null
}

const App: React.FC = () => {
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [appearance, setAppearance] = useState({ darkMode: true, themeColor: 'indigo' })

  const demoStream = useDemoStream({
    onAppend: text => getTranscriptionService().setTranscriptExternal(text),
  })

  const darkMode = appearance.darkMode
  const themeColor = appearance.themeColor

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const resetAllWindows = useCallback(() => {
    demoStream.stopStream()
    const svc = getTranscriptionService()
    svc.stopListening()
    svc.clearTranscript()
    useTranscriptStore.getState().clear()
    useTermStore.getState().resetSession()
    useBubbleStore.getState().clearBubbles()
    toast.info('すべてのウィンドウをリセットしました')
  }, [demoStream])

  const dk = darkMode

  return (
    <DemoToolsProvider value={demoStream}>
      <DemoImportantTermsBridge />
      <div
        className={`w-screen h-screen flex flex-col overflow-hidden ${dk ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}
      >
        {/* グローバルツールバー */}
        <div
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b relative z-50 ${dk ? 'bg-[#0d0e1a] border-slate-800' : 'bg-white border-slate-200'}`}
        >
          <span className="text-xs font-black tracking-widest opacity-60 mr-2">TALKSSCOPE</span>

          {/* フェーズ表示 */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentPhaseId === 'during'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-violet-500/20 text-violet-400'}`}>
            {currentPhaseId === 'during' ? '発表中' : '発表後'}
          </span>

          {currentPhaseId === 'during' && (
            <LayoutPresetMenu darkMode={darkMode} phaseId="during" />
          )}

          <div className="ml-auto flex items-center gap-2">
            <TestFeaturesPopover darkMode={darkMode} />
            <button
              type="button"
              onClick={resetAllWindows}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${dk
                ? 'text-slate-400 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/40'
                : 'text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200'}`}
              title="文字起こし・用語・履歴などをすべてクリアします"
              aria-label="すべてのウィンドウをリセット"
            >
              <RotateCcw size={14} />
              リセット
            </button>
            <button
              type="button"
              onClick={() => setAppearanceOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${dk
                ? 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50'
                : 'text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200'}`}
              aria-haspopup="dialog"
              aria-label="表示設定を開く"
            >
              <Palette size={14} />
              表示
            </button>
            <PhaseTransitionButton darkMode={darkMode} />
          </div>
        </div>

        {/* フェーズコンテンツ */}
        <div className="flex-1 overflow-hidden">
          {currentPhaseId === 'during'
            ? <DuringPresentation darkMode={darkMode} themeColor={themeColor} />
            : <AfterPresentation darkMode={darkMode} themeColor={themeColor} />
          }
        </div>

        <SettingsModal
          isOpen={appearanceOpen}
          onClose={() => setAppearanceOpen(false)}
          settings={appearance}
          updateSettings={partial => setAppearance(prev => ({ ...prev, ...partial }))}
        />

        <Toaster position="bottom-right" theme={darkMode ? 'dark' : 'light'} />
      </div>
    </DemoToolsProvider>
  )
}

export default App
