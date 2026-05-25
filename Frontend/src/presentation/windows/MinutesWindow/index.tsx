import React from 'react'
import { FileText, Loader2 } from 'lucide-react'
import type { WindowProps } from '../IWindowDefinition'
import { useAccentTheme } from '../../../theme/AccentThemeContext'
import { accentRgba } from '../../../theme/accentStyles'

export const MinutesWindow: React.FC<WindowProps> = ({ darkMode = true }) => {
  const dk = darkMode
  const { rgb } = useAccentTheme()

  return (
    <div className={`h-full flex flex-col items-center justify-center text-center p-8 gap-4 ${dk ? 'text-slate-400 bg-[#0d0e1a]' : 'text-slate-500 bg-white'}`}>
      <FileText size={40} className="opacity-30" />
      <div>
        <p className="text-sm font-bold opacity-70 mb-2">議事録</p>
        <p className="text-xs opacity-50">発表終了後、ボタンを押すと<br />AIが議事録を生成します</p>
      </div>
      <button
        className="mt-2 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-[filter] hover:brightness-110"
        style={{
          backgroundColor: accentRgba(rgb, dk ? 0.22 : 0.12),
          color: accentRgba(rgb, dk ? 0.95 : 0.88),
        }}
        onClick={() => {
          // TODO: サーバーへのリクエスト実装
        }}
      >
        <Loader2 size={12} className="opacity-60" />
        議事録を生成する
      </button>
    </div>
  )
}
