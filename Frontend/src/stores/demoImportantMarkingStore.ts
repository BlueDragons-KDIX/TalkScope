import { create } from 'zustand'

interface DemoImportantMarkingState {
  /** デモ: コードベースの単語リストで重要語マーキング・バブルを試す */
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useDemoImportantMarkingStore = create<DemoImportantMarkingState>(set => ({
  enabled: false,
  setEnabled: enabled => set({ enabled }),
}))
