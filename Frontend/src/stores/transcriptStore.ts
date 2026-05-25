import { create } from 'zustand'
import type { TranscriptionStatus } from '../domain/interfaces/ITranscriptionService'

interface TranscriptState {
  transcript: string
  status: TranscriptionStatus
  setTranscript: (text: string) => void
  setStatus: (status: TranscriptionStatus) => void
  clear: () => void
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  transcript: '',
  status: 'idle',
  setTranscript: (text) => set({ transcript: text }),
  setStatus: (status) => set({ status }),
  clear: () => set({ transcript: '' }),
}))
