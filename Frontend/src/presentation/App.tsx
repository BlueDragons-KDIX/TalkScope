import React, { useCallback, useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { DuringPresentation } from './phases/DuringPresentation'
import { AfterPresentation } from './phases/AfterPresentation'
import { usePhaseStore } from '../stores/phaseStore'
import { registerAllWindows } from './windows'
import { PresentationAppHeader } from './components/PresentationAppHeader'
import { PresentationShellProvider } from './context/PresentationShellContext'
import { DemoToolsProvider } from './context/DemoToolsContext'
import { useDemoStream } from '../debug/hooks/useDemoStream'
import { getTranscriptionService } from './hooks/useTranscription'
import { SettingsModal } from '../app/components/SettingsModal'
import { useDemoImportantTermsSync } from './hooks/useDemoImportantTermsSync'
import { ReferDictScoreSseBridge } from '../infrastructure/sse'
import { useTranscriptStore } from '../stores/transcriptStore'
import { useTermStore } from '../stores/termStore'
import { useBubbleStore } from '../stores/bubbleStore'
import { getOppositeThemeColor } from './utils/oppositeThemeColor'
import { AccentThemeProvider } from '../theme/AccentThemeContext'
import { DEFAULT_SCORE_THRESHOLD } from '../infrastructure/adapters/ScoreThresholdFilter'

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
  const [scoreThreshold, setScoreThreshold] = useState(DEFAULT_SCORE_THRESHOLD)

  const demoStream = useDemoStream({
    onAppend: text => getTranscriptionService().setTranscriptExternal(text),
  })

  const darkMode = appearance.darkMode
  /** 発表中は設定色、発表後はその補色に近いテーマへ自動切替 */
  const phaseAccentColor =
    currentPhaseId === 'during' ? appearance.themeColor : getOppositeThemeColor(appearance.themeColor)

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
      <PresentationShellProvider
        value={{
          onOpenAppearance: () => setAppearanceOpen(true),
          onResetAll: resetAllWindows,
        }}
      >
        <DemoImportantTermsBridge />
        <ReferDictScoreSseBridge scoreThreshold={scoreThreshold} />
        <AccentThemeProvider themeColor={phaseAccentColor}>
        <div
          className={`w-screen h-screen flex flex-col overflow-hidden ${dk ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}
        >
          <PresentationAppHeader
            darkMode={darkMode}
            currentPhaseId={currentPhaseId}
            onOpenAppearance={() => setAppearanceOpen(true)}
          />

          {/* フェーズコンテンツ */}
          <div className="flex-1 overflow-hidden">
            {currentPhaseId === 'during'
              ? <DuringPresentation darkMode={darkMode} themeColor={phaseAccentColor} />
              : <AfterPresentation darkMode={darkMode} themeColor={phaseAccentColor} />
            }
          </div>

          <SettingsModal
            isOpen={appearanceOpen}
            onClose={() => setAppearanceOpen(false)}
            settings={appearance}
            updateSettings={partial => setAppearance(prev => ({ ...prev, ...partial }))}
            scoreThreshold={scoreThreshold}
            onScoreThresholdChange={setScoreThreshold}
          />

          <Toaster position="bottom-right" theme={darkMode ? 'dark' : 'light'} />
        </div>
        </AccentThemeProvider>
      </PresentationShellProvider>
    </DemoToolsProvider>
  )
}

export default App
