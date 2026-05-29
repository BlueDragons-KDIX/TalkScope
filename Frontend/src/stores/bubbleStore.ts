import { create } from 'zustand'
import { useTermMapWindowSettingsStore } from './termMapWindowSettingsStore'
import { useTermStore } from './termStore'

export const LEGACY_SOFT_LIMIT = 20
export const SOFT_LIFESPAN_MS = 5000

export function computeSoftLimit(hardLimit: number): number {
  return Math.min(LEGACY_SOFT_LIMIT, hardLimit)
}

function findOldestRemovableVisibleId(
  visibleTermIds: string[],
  bubbleTimestamps: Record<string, number>,
  pinnedTermIds: Set<string>,
): string | null {
  let oldestId: string | null = null
  let oldestTs = Number.POSITIVE_INFINITY
  for (const id of visibleTermIds) {
    if (pinnedTermIds.has(id)) continue
    const ts = bubbleTimestamps[id] ?? 0
    if (ts < oldestTs) {
      oldestTs = ts
      oldestId = id
    }
  }
  return oldestId
}

interface BubbleState {
  visibleTermIds: string[]
  bubbleTimestamps: Record<string, number>

  /** 表示枠へ追加。スター枠満杯などで入れられない場合は false */
  addVisibleTermId: (termId: string) => boolean
  removeVisibleTermId: (termId: string) => void
  clearVisible: () => void
}

export const useBubbleStore = create<BubbleState>((set, get) => ({
  visibleTermIds: [],
  bubbleTimestamps: {},

  addVisibleTermId: (termId) => {
    const hardLimit = useTermMapWindowSettingsStore.getState().maxVisibleTerms
    const pinnedTermIds = useTermStore.getState().pinnedTermIds
    const state = get()
    if (state.visibleTermIds.includes(termId)) return true

    let visibleTermIds = [...state.visibleTermIds]
    let bubbleTimestamps = { ...state.bubbleTimestamps }

    while (visibleTermIds.length >= hardLimit) {
      const removableId = findOldestRemovableVisibleId(visibleTermIds, bubbleTimestamps, pinnedTermIds)
      if (!removableId) return false
      visibleTermIds = visibleTermIds.filter((id) => id !== removableId)
      const { [removableId]: _, ...rest } = bubbleTimestamps
      bubbleTimestamps = rest
    }

    const now = Date.now()
    set({
      visibleTermIds: [...visibleTermIds, termId],
      bubbleTimestamps: { ...bubbleTimestamps, [termId]: now },
    })
    return true
  },

  removeVisibleTermId: (termId) => set((state) => {
    if (!state.visibleTermIds.includes(termId)) return {}
    const { [termId]: _, ...rest } = state.bubbleTimestamps
    return {
      visibleTermIds: state.visibleTermIds.filter((id) => id !== termId),
      bubbleTimestamps: rest,
    }
  }),

  clearVisible: () => set({ visibleTermIds: [], bubbleTimestamps: {} }),
}))
