import { create } from 'zustand'
import type { Term } from '../domain/entities/Term'
import { normalizeTermCategory } from '../domain/entities/Term'
import { DEMO_IMPORTANT_TERM_ID_PREFIX } from '../debug/demo/mockImportantTerms'
import { useTermMapWindowSettingsStore } from './termMapWindowSettingsStore'

interface TermState {
  activeTerms: Term[]
  termTimestamps: Record<string, number>
  selectedTerm: Term | null
  searchHistory: Term[]
  pinnedTermIds: Set<string>

  addTerms: (terms: Term[]) => void
  updateTermScore: (id: string, score: number) => void
  removeTermById: (id: string) => void
  /** デモ重要語マーキングで注入した用語だけ除去（prefix は mockImportantTerms と一致させる） */
  stripDemoImportantTerms: () => void
  selectTerm: (term: Term | null) => void
  togglePin: (termId: string) => void
  addToHistory: (term: Term) => void
  clearHistory: () => void
  clearActiveTerms: () => void
  /** 用語・選択・履歴・ピンをまとめて初期化（グローバルリセット用） */
  resetSession: () => void
}

export const useTermStore = create<TermState>((set) => ({
  activeTerms: [],
  termTimestamps: {},
  selectedTerm: null,
  searchHistory: [],
  pinnedTermIds: new Set(),

  addTerms: (terms) => set((state) => {
    const now = Date.now()
    const maxVisibleTerms = useTermMapWindowSettingsStore.getState().maxVisibleTerms
    const pinnedCount = state.activeTerms.filter((term) => state.pinnedTermIds.has(term.id)).length
    if (state.activeTerms.length >= maxVisibleTerms && pinnedCount >= maxVisibleTerms) {
      return state
    }
    const availableSlots = Math.max(0, maxVisibleTerms - state.activeTerms.length)
    if (availableSlots <= 0) {
      return state
    }

    const existingIds = new Set(state.activeTerms.map(t => t.id))
    const newTerms: Term[] = []
    const nextTermTimestamps = { ...state.termTimestamps }
    for (const t of terms) {
      if (newTerms.length >= availableSlots) break
      if (!existingIds.has(t.id)) {
        existingIds.add(t.id)
        nextTermTimestamps[t.id] = now
        newTerms.push({
          ...t,
          category: normalizeTermCategory(t.category),
        })
      }
    }
    return {
      activeTerms: [...state.activeTerms, ...newTerms],
      termTimestamps: nextTermTimestamps,
    }
  }),

  updateTermScore: (id, score) => set((state) => ({
    activeTerms: state.activeTerms.map((term) => (
      term.id === id ? { ...term, score } : term
    )),
  })),

  removeTermById: (id) => set((state) => {
    const nextTermTimestamps = { ...state.termTimestamps }
    delete nextTermTimestamps[id]
    return {
      activeTerms: state.activeTerms.filter(t => t.id !== id),
      termTimestamps: nextTermTimestamps,
    }
  }),

  stripDemoImportantTerms: () => set((state) => {
    const activeTerms = state.activeTerms.filter(
      t => !t.id.startsWith(DEMO_IMPORTANT_TERM_ID_PREFIX),
    )
    const activeIds = new Set(activeTerms.map((term) => term.id))
    const nextTermTimestamps = Object.fromEntries(
      Object.entries(state.termTimestamps).filter(([id]) => activeIds.has(id)),
    )
    return { activeTerms, termTimestamps: nextTermTimestamps }
  }),

  selectTerm: (term) => set({ selectedTerm: term }),

  togglePin: (termId) => set((state) => {
    const next = new Set(state.pinnedTermIds)
    if (next.has(termId)) next.delete(termId)
    else next.add(termId)
    return { pinnedTermIds: next }
  }),

  addToHistory: (term) => set((state) => {
    if (state.searchHistory.some(t => t.id === term.id)) return {}
    return { searchHistory: [...state.searchHistory, term] }
  }),

  clearHistory: () => set({ searchHistory: [] }),

  clearActiveTerms: () => set({ activeTerms: [], termTimestamps: {} }),

  resetSession: () => set({
    activeTerms: [],
    termTimestamps: {},
    selectedTerm: null,
    searchHistory: [],
    pinnedTermIds: new Set(),
  }),
}))
