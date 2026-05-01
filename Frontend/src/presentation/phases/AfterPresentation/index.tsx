import React, { useEffect } from 'react'
import { LayoutEngine } from '../../layout/LayoutEngine'
import { useLayoutStore } from '../../../stores/layoutStore'
import { makeAfterLayout, removeLeaf } from '../../layout/layoutUtils'
import type { LayoutNode } from '../../../domain/entities/Layout'

const PHASE_ID = 'after'

interface Props {
  darkMode?: boolean
  themeColor?: string
}

export const AfterPresentation: React.FC<Props> = ({ darkMode = true, themeColor = 'indigo' }) => {
  const layout = useLayoutStore(s => s.layouts[PHASE_ID])
  const setLayout = useLayoutStore(s => s.setLayout)

  useEffect(() => {
    if (!layout) setLayout(PHASE_ID, makeAfterLayout())
  }, [layout, setLayout])

  if (!layout) return null

  const handleLayoutChange = (newLayout: LayoutNode) => {
    setLayout(PHASE_ID, newLayout)
  }

  const handleClose = (windowId: string) => {
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
