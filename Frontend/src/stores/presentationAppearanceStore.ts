import { create } from 'zustand'

export interface PresentationAppearance {
  darkMode: boolean
  themeColor: string
}

interface PresentationAppearanceState extends PresentationAppearance {
  applyAppearance: (partial: Partial<PresentationAppearance>) => void
}

export const usePresentationAppearanceStore = create<PresentationAppearanceState>((set) => ({
  darkMode: true,
  themeColor: 'indigo',

  applyAppearance: (partial) => set((state) => ({
    darkMode: partial.darkMode ?? state.darkMode,
    themeColor: partial.themeColor ?? state.themeColor,
  })),
}))
