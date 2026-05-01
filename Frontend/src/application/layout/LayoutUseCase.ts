import type { LayoutNode } from '../../domain/entities/Layout'
import { useLayoutStore } from '../../stores/layoutStore'

export class LayoutUseCase {
  setLayout(phaseId: string, layout: LayoutNode): void {
    useLayoutStore.getState().setLayout(phaseId, layout)
  }

  getLayout(phaseId: string): LayoutNode | null {
    return useLayoutStore.getState().getLayout(phaseId)
  }

  /** 現在のレイアウトをJSON文字列で返す（将来の保存・共有機能のための口） */
  getCurrentLayoutJson(phaseId: string): string {
    const layout = this.getLayout(phaseId)
    return JSON.stringify(layout)
  }

  updateRatio(phaseId: string, nodeId: string, ratio: number): void {
    const layout = this.getLayout(phaseId)
    if (!layout) return
    const updated = this.applyRatio(layout, nodeId, ratio)
    this.setLayout(phaseId, updated)
  }

  private applyRatio(node: LayoutNode, targetId: string, ratio: number): LayoutNode {
    if (node.type === 'leaf') return node
    if (node.id === targetId) return { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) }
    return {
      ...node,
      a: this.applyRatio(node.a, targetId, ratio),
      b: this.applyRatio(node.b, targetId, ratio),
    }
  }
}
