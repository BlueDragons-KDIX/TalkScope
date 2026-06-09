import { create } from 'zustand'

export const FLOATING_DOCK_SCALE_MIN = 0.8
export const FLOATING_DOCK_SCALE_MAX = 1.8

export interface FloatingControlDockPosition {
  x: number
  y: number
}

export interface FloatingControlDockUiState {
  position: FloatingControlDockPosition | null
  scale: number
  setPosition: (position: FloatingControlDockPosition | null) => void
  setScale: (scale: number) => void
  applyUiState: (state: { position: FloatingControlDockPosition | null; scale: number }) => void
}

const clampScale = (scale: number): number =>
  Math.min(FLOATING_DOCK_SCALE_MAX, Math.max(FLOATING_DOCK_SCALE_MIN, scale))

export const useFloatingControlDockUiStore = create<FloatingControlDockUiState>((set) => ({
  position: null,
  scale: 1,

  setPosition: (position) => set({ position }),

  setScale: (scale) => set({ scale: clampScale(scale) }),

  applyUiState: ({ position, scale }) => set({
    position,
    scale: clampScale(scale),
  }),
}))
