import { create } from 'zustand'

interface PhaseState {
  currentPhaseId: string
  transitionTo: (phaseId: string) => void
}

export const usePhaseStore = create<PhaseState>((set) => ({
  currentPhaseId: 'during',
  transitionTo: (phaseId) => set({ currentPhaseId: phaseId }),
}))
