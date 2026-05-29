import { create } from 'zustand'

interface WindowSettingsUiState {
  openWindowId: string | null
  setOpenWindowId: (windowId: string | null) => void
}

export const useWindowSettingsUiStore = create<WindowSettingsUiState>((set) => ({
  openWindowId: null,
  setOpenWindowId: (windowId) => set({ openWindowId: windowId }),
}))
