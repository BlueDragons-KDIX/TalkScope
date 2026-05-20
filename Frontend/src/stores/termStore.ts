import { create } from 'zustand'
import type { Term } from '../domain/entities/Term'
import { normalizeTermCategory } from '../domain/entities/Term'
import { DEMO_IMPORTANT_TERM_ID_PREFIX } from '../debug/demo/mockImportantTerms'

interface TermState {
  activeTerms: Term[]
  selectedTerm: Term | null
  searchHistory: Term[]
  pinnedTermIds: Set<string>
  termClickWeights: Record<string, number>

  addTerms: (terms: Term[]) => void
  removeTermById: (id: string) => void
  /** デモ重要語マーキングで注入した用語だけ除去（prefix は mockImportantTerms と一致させる） */
  stripDemoImportantTerms: () => void
  selectTerm: (term: Term | null) => void
  togglePin: (termId: string) => void
  incrementClickWeight: (termId: string) => void
  addToHistory: (term: Term) => void
  clearHistory: () => void
  clearActiveTerms: () => void
  /** 用語・選択・履歴・ピン・クリック重みをまとめて初期化（グローバルリセット用） */
  resetSession: () => void
}

export const useTermStore = create<TermState>((set) => ({
  activeTerms: [],
  selectedTerm: null,
  searchHistory: [],
  pinnedTermIds: new Set(),
  termClickWeights: {},

  addTerms: (terms) => set((state) => {
    const existingIds = new Set(state.activeTerms.map(t => t.id))
    const newTerms: Term[] = []
    for (const t of terms) {
      if (!existingIds.has(t.id)) {
        existingIds.add(t.id)
        newTerms.push({
          ...t,
          category: normalizeTermCategory(t.category),
        })
      }
    }
    return { activeTerms: [...state.activeTerms, ...newTerms] }
  }),

  removeTermById: (id) => set((state) => ({
    activeTerms: state.activeTerms.filter(t => t.id !== id),
  })),

  stripDemoImportantTerms: () => set((state) => ({
    activeTerms: state.activeTerms.filter(
      t => !t.id.startsWith(DEMO_IMPORTANT_TERM_ID_PREFIX),
    ),
  })),

  selectTerm: (term) => set({ selectedTerm: term }),

  togglePin: (termId) => set((state) => {
    const next = new Set(state.pinnedTermIds)
    if (next.has(termId)) next.delete(termId)
    else next.add(termId)
    return { pinnedTermIds: next }
  }),

  incrementClickWeight: (termId) => set((state) => ({
    termClickWeights: {
      ...state.termClickWeights,
      [termId]: (state.termClickWeights[termId] ?? 0) + 1,
    },
  })),

  addToHistory: (term) => set((state) => {
    if (state.searchHistory.some(t => t.id === term.id)) return {}
    return { searchHistory: [...state.searchHistory, term] }
  }),

  clearHistory: () => set({ searchHistory: [] }),

  clearActiveTerms: () => set({ activeTerms: [] }),

  resetSession: () => set({
    activeTerms: [],
    selectedTerm: null,
    searchHistory: [],
    pinnedTermIds: new Set(),
    termClickWeights: {},
  }),
}))
