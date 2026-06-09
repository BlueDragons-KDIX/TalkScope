import { create } from 'zustand'
import type { Term } from '../domain/entities/Term'
import { normalizeTermCategory } from '../domain/entities/Term'
import { DEMO_IMPORTANT_TERM_ID_PREFIX } from '../debug/demo/mockImportantTerms'

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
    const existingIds = new Set(state.activeTerms.map((term) => term.id))
    const nextActiveTerms = [...state.activeTerms]
    const nextTermTimestamps = { ...state.termTimestamps }

    for (const t of terms) {
      if (existingIds.has(t.id)) continue

      const normalized: Term = {
        ...t,
        category: normalizeTermCategory(t.category),
      }
      nextActiveTerms.push(normalized)
      nextTermTimestamps[normalized.id] = now
      existingIds.add(normalized.id)
    }

    return {
      activeTerms: nextActiveTerms,
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
