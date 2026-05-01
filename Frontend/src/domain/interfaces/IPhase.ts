import type { LayoutNode } from '../entities/Layout'

export interface IPhase {
  readonly id: string
  readonly name: string
  readonly defaultLayout: LayoutNode
  onEnter?(): void
  onExit?(): void
}
