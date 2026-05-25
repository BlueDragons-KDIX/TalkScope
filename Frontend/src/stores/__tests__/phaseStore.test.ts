import { describe, it, expect, beforeEach } from 'bun:test'
import { usePhaseStore } from '../phaseStore'

describe('phaseStore', () => {
  beforeEach(() => {
    usePhaseStore.setState({ currentPhaseId: 'during' })
  })

  it('初期フェーズは during', () => {
    expect(usePhaseStore.getState().currentPhaseId).toBe('during')
  })

  it('フェーズを after に遷移できる', () => {
    usePhaseStore.getState().transitionTo('after')
    expect(usePhaseStore.getState().currentPhaseId).toBe('after')
  })

  it('フェーズを during に戻せる', () => {
    usePhaseStore.getState().transitionTo('after')
    usePhaseStore.getState().transitionTo('during')
    expect(usePhaseStore.getState().currentPhaseId).toBe('during')
  })
})
