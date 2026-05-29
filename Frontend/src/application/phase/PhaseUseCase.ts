import { usePhaseStore } from '../../stores/phaseStore'
import { useLayoutStore } from '../../stores/layoutStore'
import { useBubbleStore } from '../../stores/bubbleStore'
import type { IPhase } from '../../domain/interfaces/IPhase'

export class PhaseUseCase {
  private phases: Map<string, IPhase> = new Map()

  register(phase: IPhase): void {
    this.phases.set(phase.id, phase)
  }

  transitionTo(phaseId: string): void {
    const store = usePhaseStore.getState()
    const current = this.phases.get(store.currentPhaseId)
    const next = this.phases.get(phaseId)

    current?.onExit?.()

    store.transitionTo(phaseId)

    if (next) {
      const existingLayout = useLayoutStore.getState().getLayout(phaseId)
      if (!existingLayout) {
        useLayoutStore.getState().setLayout(phaseId, next.defaultLayout)
      }
      next.onEnter?.()
    }
  }

  getCurrentPhaseId(): string {
    return usePhaseStore.getState().currentPhaseId
  }

  endPresentation(): void {
    useBubbleStore.getState().clearVisible()
    this.transitionTo('after')
  }
}
