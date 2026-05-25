import type React from 'react'

export interface WindowProps {
  windowId: string
  darkMode?: boolean
}

export interface IWindowDefinition {
  id: string
  label: string
  component: React.ComponentType<WindowProps>
  /** false のときレイアウトから閉じられない（閉じボタン非表示） */
  closable?: boolean
}
