import { create } from 'zustand'
import type { Bubble } from '../domain/entities/Bubble'

const MAX_BUBBLES = 30
const SOFT_LIMIT = 20
const SOFT_LIFESPAN_MS = 5000

interface BubbleState {
  bubbles: Bubble[]
  bubbleTimestamps: Record<string, number>

  upsertBubble: (bubble: Bubble) => void
  removeBubbleByTermId: (termId: string) => void
  pruneExpired: () => void
  clearBubbles: () => void
}

export const useBubbleStore = create<BubbleState>((set, get) => ({
  bubbles: [],
  bubbleTimestamps: {},

  upsertBubble: (bubble) => set((state) => {
    const exists = state.bubbles.some(b => b.term.id === bubble.term.id)
    const now = Date.now()

    let bubbles = exists
      ? state.bubbles.map(b => b.term.id === bubble.term.id ? bubble : b)
      : [...state.bubbles, bubble]

    const timestamps = exists
      ? state.bubbleTimestamps
      : { ...state.bubbleTimestamps, [bubble.term.id]: now }

    // 上限超過時は最古のものを削除
    if (bubbles.length > MAX_BUBBLES) {
      const oldest = bubbles.reduce((a, b) =>
        (timestamps[a.term.id] ?? 0) < (timestamps[b.term.id] ?? 0) ? a : b
      )
      bubbles = bubbles.filter(b => b.term.id !== oldest.term.id)
      const { [oldest.term.id]: _, ...rest } = timestamps
      return { bubbles, bubbleTimestamps: rest }
    }

    return { bubbles, bubbleTimestamps: timestamps }
  }),

  removeBubbleByTermId: (termId) => set((state) => {
    const { [termId]: _, ...rest } = state.bubbleTimestamps
    return {
      bubbles: state.bubbles.filter(b => b.term.id !== termId),
      bubbleTimestamps: rest,
    }
  }),

  pruneExpired: () => set((state) => {
    if (state.bubbles.length <= SOFT_LIMIT) return {}
    const now = Date.now()
    const toRemove = new Set<string>()
    for (const bubble of state.bubbles) {
      const addedAt = state.bubbleTimestamps[bubble.term.id] ?? now
      if (now - addedAt > SOFT_LIFESPAN_MS) {
        toRemove.add(bubble.term.id)
      }
    }
    if (toRemove.size === 0) return {}
    const timestamps = { ...state.bubbleTimestamps }
    toRemove.forEach(id => delete timestamps[id])
    return {
      bubbles: state.bubbles.filter(b => !toRemove.has(b.term.id)),
      bubbleTimestamps: timestamps,
    }
  }),

  clearBubbles: () => set({ bubbles: [], bubbleTimestamps: {} }),
}))
