import { create } from 'zustand'
import type { Term } from '../domain/entities/Term'
import type { TermRow } from '../infrastructure/mapper/StreamTypes'

const MAX_ITEMS = 60

export interface DebugSseTerm {
  term: string
  score: number
  source: string
}

export interface DebugFilteredTerm {
  id: string
  word: string
  score: number
  passed: boolean
}

type LayerKey = 'sent' | 'sse' | 'filtered' | 'bubble'

interface PipelineDebugState {
  sentInputs: string[]
  sseTerms: DebugSseTerm[]
  filteredThreshold: number
  filteredPassedTerms: DebugFilteredTerm[]
  filteredRejectedTerms: DebugFilteredTerm[]
  bubbleTerms: DebugFilteredTerm[]
  visibleLayers: Record<LayerKey, boolean>
  pushSentInput: (text: string) => void
  pushSseRows: (rows: TermRow[]) => void
  setFilteredThreshold: (threshold: number) => void
  setFilteredTerms: (threshold: number, passedTerms: Term[], rejectedTerms: Term[]) => void
  setBubbleTerms: (terms: Term[]) => void
  toggleLayer: (layer: LayerKey) => void
  clearAll: () => void
}

function keepRecent<T>(items: T[]): T[] {
  if (items.length <= MAX_ITEMS) return items
  return items.slice(items.length - MAX_ITEMS)
}

export const usePipelineDebugStore = create<PipelineDebugState>((set) => ({
  sentInputs: [],
  sseTerms: [],
  filteredThreshold: 0.42,
  filteredPassedTerms: [],
  filteredRejectedTerms: [],
  bubbleTerms: [],
  visibleLayers: {
    sent: true,
    sse: true,
    filtered: true,
    bubble: true,
  },

  pushSentInput: (text) => set((state) => ({
    sentInputs: keepRecent([...state.sentInputs, text]),
  })),

  pushSseRows: (rows) => set((state) => ({
    sseTerms: keepRecent([
      ...state.sseTerms,
      ...rows.map((row) => ({
        term: row.term,
        score: row.score,
        source: row.source,
      })),
    ]),
  })),

  setFilteredThreshold: (threshold) => set({
    filteredThreshold: threshold,
  }),

  setFilteredTerms: (threshold, passedTerms, rejectedTerms) => set({
    filteredThreshold: threshold,
    filteredPassedTerms: keepRecent(passedTerms.map((term) => ({
      id: term.id,
      word: term.word,
      score: term.score,
      passed: true,
    }))),
    filteredRejectedTerms: keepRecent(rejectedTerms.map((term) => ({
      id: term.id,
      word: term.word,
      score: term.score,
      passed: false,
    }))),
  }),

  setBubbleTerms: (terms) => set({
    bubbleTerms: keepRecent(terms.map((term) => ({
      id: term.id,
      word: term.word,
      score: term.score,
      passed: true,
    }))),
  }),

  toggleLayer: (layer) => set((state) => ({
    visibleLayers: {
      ...state.visibleLayers,
      [layer]: !state.visibleLayers[layer],
    },
  })),

  clearAll: () => set({
    sentInputs: [],
    sseTerms: [],
    filteredPassedTerms: [],
    filteredRejectedTerms: [],
    bubbleTerms: [],
  }),
}))
