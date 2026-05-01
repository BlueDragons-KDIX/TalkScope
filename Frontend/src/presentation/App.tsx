import React, { useState } from 'react'
import { Toaster } from 'sonner'
import { DuringPresentation } from './phases/DuringPresentation'
import { AfterPresentation } from './phases/AfterPresentation'
import { usePhaseStore } from '../stores/phaseStore'
import { registerAllWindows } from './windows'
import { PhaseTransitionButton } from './components/PhaseTransitionButton'
import { LayoutPresetMenu } from './components/LayoutPresetMenu'

// ウィンドウを一度だけ登録
let _registered = false
if (!_registered) {
  registerAllWindows()
  _registered = true
}

const App: React.FC = () => {
  const currentPhaseId = usePhaseStore(s => s.currentPhaseId)
  const [darkMode] = useState(true)
  const [themeColor] = useState('indigo')

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden ${darkMode ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* グローバルツールバー */}
      <div
        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b ${darkMode ? 'bg-[#0d0e1a] border-slate-800' : 'bg-white border-slate-200'}`}
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

      <Toaster position="bottom-right" theme={darkMode ? 'dark' : 'light'} />
    </div>
  )
}

export default App
