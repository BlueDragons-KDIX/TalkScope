import React from 'react'
import { RefreshCw } from 'lucide-react'
import { accentRgba } from '../../theme/accentStyles'
import { useTermMapWindowSettingsStore } from '../../stores/termMapWindowSettingsStore'

interface Props {
  darkMode: boolean
  accentRgb: string
}

export const BubbleAutoSwitchHeaderButton: React.FC<Props> = ({ darkMode, accentRgb }) => {
  const enabled = useTermMapWindowSettingsStore(s => s.autoSwitchEnabled)
  const setEnabled = useTermMapWindowSettingsStore(s => s.setAutoSwitchEnabled)
  const dk = darkMode

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`自動切り替え ${enabled ? 'ON' : 'OFF'}`}
      title={enabled ? '自動切り替え ON（クリックで OFF）' : '自動切り替え OFF（クリックで ON）'}
      draggable={false}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation()
        setEnabled(!enabled)
      }}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 transition-[filter,box-shadow,background-color,border-color] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--app-accent-rgb)/0.45)] focus-visible:ring-offset-1 ${dk ? 'focus-visible:ring-offset-[#0d0e1a]' : 'focus-visible:ring-offset-white'}`}
      style={enabled
        ? {
            borderColor: accentRgba(accentRgb, dk ? 0.72 : 0.58),
            backgroundColor: accentRgba(accentRgb, dk ? 0.38 : 0.22),
            color: accentRgba(accentRgb, dk ? 1 : 0.95),
            boxShadow: `0 0 14px ${accentRgba(accentRgb, dk ? 0.35 : 0.22)}`,
          }
        : {
            borderColor: dk ? 'rgba(100,116,139,0.45)' : 'rgba(148,163,184,0.55)',
            backgroundColor: dk ? 'rgba(30,41,59,0.55)' : 'rgba(248,250,252,0.95)',
            color: dk ? 'rgb(148,163,184)' : 'rgb(100,116,139)',
          }}
    >
      <RefreshCw
        size={14}
        strokeWidth={2.25}
        className={enabled ? 'animate-[spin_3s_linear_infinite]' : 'opacity-70'}
      />
      {/* <span className="text-[10px] font-bold leading-none">自動</span> */}
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide"
        style={enabled
          ? {
              backgroundColor: accentRgba(accentRgb, dk ? 0.55 : 0.35),
              color: '#fff',
            }
          : {
              backgroundColor: dk ? 'rgba(51,65,85,0.8)' : 'rgba(226,232,240,1)',
              color: dk ? 'rgb(203,213,225)' : 'rgb(71,85,105)',
            }}
      >
        {enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}
