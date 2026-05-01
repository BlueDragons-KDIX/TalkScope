import type { LayoutNode } from '../../domain/entities/Layout'

const STORAGE_PREFIX = 'talksscope:layout:'

export class LayoutRepository {
  private storage: Storage | null

  constructor(storage?: Storage) {
    this.storage = storage ?? null
  }

  private getStorage(): Storage {
    if (this.storage) return this.storage
    if (typeof localStorage !== 'undefined') return localStorage
    throw new Error('localStorage is not available')
  }

  save(phaseId: string, layout: LayoutNode): void {
    this.getStorage().setItem(`${STORAGE_PREFIX}${phaseId}`, JSON.stringify(layout))
  }

  load(phaseId: string): LayoutNode | null {
    const raw = this.getStorage().getItem(`${STORAGE_PREFIX}${phaseId}`)
    if (!raw) return null
    try {
      return JSON.parse(raw) as LayoutNode
    } catch {
      return null
    }
  }

  serialize(phaseId: string): string {
    return this.getStorage().getItem(`${STORAGE_PREFIX}${phaseId}`) ?? 'null'
  }
}
