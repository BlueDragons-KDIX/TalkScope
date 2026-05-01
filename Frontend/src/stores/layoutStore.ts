import { create } from 'zustand'
import type { LayoutNode } from '../domain/entities/Layout'
import { LayoutRepository } from '../infrastructure/storage/LayoutRepository'

interface LayoutState {
  layouts: Record<string, LayoutNode>
  setLayout: (phaseId: string, layout: LayoutNode) => void
  getLayout: (phaseId: string) => LayoutNode | null
  saveLayout: (phaseId: string) => void
  loadLayout: (phaseId: string) => void
}

const repository = new LayoutRepository()

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layouts: {},

  setLayout: (phaseId, layout) => set((state) => ({
    layouts: { ...state.layouts, [phaseId]: layout },
  })),

  getLayout: (phaseId) => get().layouts[phaseId] ?? null,

  saveLayout: (phaseId) => {
    const layout = get().layouts[phaseId]
    if (layout) repository.save(phaseId, layout)
  },

  loadLayout: (phaseId) => {
    const layout = repository.load(phaseId)
    if (layout) set((state) => ({
      layouts: { ...state.layouts, [phaseId]: layout },
    }))
  },
}))
