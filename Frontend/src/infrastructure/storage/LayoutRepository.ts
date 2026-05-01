import type { LayoutNode } from '../../domain/entities/Layout'

const STORAGE_PREFIX = 'talksscope:layout:'

export class LayoutRepository {
  private storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
  }

  save(phaseId: string, layout: LayoutNode): void {
    this.storage.setItem(`${STORAGE_PREFIX}${phaseId}`, JSON.stringify(layout))
  }

  load(phaseId: string): LayoutNode | null {
    const raw = this.storage.getItem(`${STORAGE_PREFIX}${phaseId}`)
    if (!raw) return null
    try {
      return JSON.parse(raw) as LayoutNode
    } catch {
      return null
    }
  }

  serialize(phaseId: string): string {
    return this.storage.getItem(`${STORAGE_PREFIX}${phaseId}`) ?? 'null'
  }
}
