import type { DropZone, LeafNode, LayoutNode, SplitNode } from '../../domain/entities/Layout'
import { newNodeId } from '../../domain/entities/Layout'

const L = (windowId: string): LeafNode => ({ type: 'leaf', id: newNodeId(), windowId })
const S = (direction: 'h' | 'v', ratio: number, a: LayoutNode, b: LayoutNode): SplitNode =>
  ({ type: 'split', id: newNodeId(), direction, ratio, a, b })

// ── 発表中フェーズのデフォルトレイアウト ──
export const makeDefaultLayout = (): LayoutNode =>
  S(
    'h',
    0.36,
    L('transcription'),
    S('h', 0.54, L('bubbleCloud'), S('v', 0.44, L('detail'), S('v', 0.5, L('importanceRanking'), L('history')))),
  )

export const makeLeftRightLayout = (): LayoutNode =>
  S('h', 0.4, L('transcription'), S('v', 0.38, L('bubbleCloud'), S('h', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history')))))

export const make2x2Layout = (): LayoutNode =>
  S('v', 0.5, S('h', 0.5, L('transcription'), L('bubbleCloud')), S('h', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history'))))

export const makeHorizontalLayout = (): LayoutNode =>
  S('h', 0.24, L('transcription'), S('h', 0.316, L('bubbleCloud'), S('h', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history')))))

export const makeVerticalLayout = (): LayoutNode =>
  S('v', 0.22, L('transcription'), S('v', 0.32, L('bubbleCloud'), S('v', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history')))))

// ── 発表後フェーズのデフォルトレイアウト ──
export const makeAfterLayout = (): LayoutNode =>
  L('minutes')

// ── ツリー操作 ──

export function removeLeaf(node: LayoutNode, windowId: string): LayoutNode | null {
  if (node.type === 'leaf') return node.windowId === windowId ? null : node
  const a = removeLeaf(node.a, windowId)
  const b = removeLeaf(node.b, windowId)
  if (a === null && b === null) return null
  if (a === null) return b!
  if (b === null) return a
  return { ...node, a, b }
}

export function insertLeaf(node: LayoutNode, targetWindowId: string, draggedWindowId: string, zone: DropZone): LayoutNode {
  if (node.type === 'leaf') {
    if (node.windowId !== targetWindowId) return node
    const dragged: LeafNode = { type: 'leaf', id: newNodeId(), windowId: draggedWindowId }
    const dir = zone === 'left' || zone === 'right' ? 'h' : 'v'
    const isFirst = zone === 'left' || zone === 'top'
    return { type: 'split', id: newNodeId(), direction: dir, ratio: 0.5, a: isFirst ? dragged : node, b: isFirst ? node : dragged }
  }
  return { ...node, a: insertLeaf(node.a, targetWindowId, draggedWindowId, zone), b: insertLeaf(node.b, targetWindowId, draggedWindowId, zone) }
}

export function movePanel(layout: LayoutNode, draggedId: string, targetId: string, zone: DropZone): LayoutNode {
  if (draggedId === targetId) return layout
  const without = removeLeaf(layout, draggedId)
  if (!without) return layout
  return insertLeaf(without, targetId, draggedId, zone)
}

export function updateRatio(node: LayoutNode, splitId: string, ratio: number): LayoutNode {
  if (node.type === 'leaf') return node
  if (node.id === splitId) return { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) }
  return { ...node, a: updateRatio(node.a, splitId, ratio), b: updateRatio(node.b, splitId, ratio) }
}
