import React, { useEffect } from 'react'
import { LayoutEngine } from '../../layout/LayoutEngine'
import { useLayoutStore } from '../../../stores/layoutStore'
import { removeLeaf } from '../../layout/layoutUtils'
import { applyPresentationSnapshot } from '../../layout/presentationSnapshot'
import { ScriptableLayoutTemplates } from '../../layout/ScriptableLayoutTemplates'
import type { LayoutNode } from '../../../domain/entities/Layout'
import { SYSTEM_CONTROL_WINDOW_ID } from '../../constants/systemControlWindow'

const PHASE_ID = 'during'

interface Props {
  darkMode?: boolean
  themeColor?: string
}

export const DuringPresentation: React.FC<Props> = ({ darkMode = true, themeColor = 'indigo' }) => {
  const layout = useLayoutStore(s => s.layouts[PHASE_ID])
  const setLayout = useLayoutStore(s => s.setLayout)

  useEffect(() => {
    if (layout) return
    const snapshot = new ScriptableLayoutTemplates().bubbleFocusedPresentationSnapshot()
    applyPresentationSnapshot(snapshot)
    setLayout(PHASE_ID, snapshot.layout)
  }, [layout, setLayout])

  if (!layout) return null

  const handleLayoutChange = (newLayout: LayoutNode) => {
    setLayout(PHASE_ID, newLayout)
  }

  const handleClose = (windowId: string) => {
    if (windowId === SYSTEM_CONTROL_WINDOW_ID) return
    const updated = removeLeaf(layout, windowId)
    if (updated) setLayout(PHASE_ID, updated)
  }

  return (
    <LayoutEngine
      layout={layout}
      onLayoutChange={handleLayoutChange}
      darkMode={darkMode}
      themeColor={themeColor}
      onClose={handleClose}
    />
  )
}
