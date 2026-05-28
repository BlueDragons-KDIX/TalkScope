import { create } from 'zustand'

const MAX_LOGS = 200

export type TriggerTimelineType =
  | 'transcriptFinalized'
  | 'sentToServer'
  | 'sseReceived'
  | 'filtered'
  | 'bubbleCreated'

export interface TriggerTimelineEntry {
  id: string
  type: TriggerTimelineType
  summary: string
  detail: string
  occurredAt: number
}

interface TriggerTimelineState {
  logs: TriggerTimelineEntry[]
  visibleTypes: Record<TriggerTimelineType, boolean>
  appendLog: (entry: Omit<TriggerTimelineEntry, 'id' | 'occurredAt'>) => void
  toggleType: (type: TriggerTimelineType) => void
  clearLogs: () => void
}

function keepRecent<T>(items: T[]): T[] {
  if (items.length <= MAX_LOGS) return items
  return items.slice(items.length - MAX_LOGS)
}

function createId(type: TriggerTimelineType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useTriggerTimelineStore = create<TriggerTimelineState>((set) => ({
  logs: [],
  visibleTypes: {
    transcriptFinalized: true,
    sentToServer: true,
    sseReceived: true,
    filtered: true,
    bubbleCreated: true,
  },

  appendLog: (entry) => set((state) => ({
    logs: keepRecent([
      ...state.logs,
      {
        ...entry,
        id: createId(entry.type),
        occurredAt: Date.now(),
      },
    ]),
  })),

  toggleType: (type) => set((state) => ({
    visibleTypes: {
      ...state.visibleTypes,
      [type]: !state.visibleTypes[type],
    },
  })),

  clearLogs: () => set({
    logs: [],
  }),
}))
