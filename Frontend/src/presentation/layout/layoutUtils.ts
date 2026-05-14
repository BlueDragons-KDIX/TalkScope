import type { DropZone, LeafNode, LayoutNode, SplitNode } from '../../domain/entities/Layout'
import { newNodeId } from '../../domain/entities/Layout'
import { SYSTEM_CONTROL_WINDOW_ID } from '../constants/systemControlWindow'

const L = (windowId: string): LeafNode => ({ type: 'leaf', id: newNodeId(), windowId })
const S = (direction: 'h' | 'v', ratio: number, a: LayoutNode, b: LayoutNode): SplitNode =>
  ({ type: 'split', id: newNodeId(), direction, ratio, a, b })

/** 左列に削除不可の操作ウィンドウを付与する（発表中レイアウト用） */
export function attachSystemControlDock(inner: LayoutNode, dockRatio = 0.18): LayoutNode {
  return S('h', dockRatio, L(SYSTEM_CONTROL_WINDOW_ID), inner)
}

// ── 発表中フェーズのデフォルトレイアウト ──
export const makeDefaultLayout = (): LayoutNode =>
  attachSystemControlDock(
    S(
      'h',
      0.36,
      L('transcription'),
      S('h', 0.54, L('bubbleCloud'), S('v', 0.44, L('detail'), S('v', 0.5, L('importanceRanking'), L('history')))),
    ),
  )

export const makeLeftRightLayout = (): LayoutNode =>
  attachSystemControlDock(
    S('h', 0.4, L('transcription'), S('v', 0.38, L('bubbleCloud'), S('h', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history'))))),
  )

export const make2x2Layout = (): LayoutNode =>
  attachSystemControlDock(
    S('v', 0.5, S('h', 0.5, L('transcription'), L('bubbleCloud')), S('h', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history')))),
  )

export const makeHorizontalLayout = (): LayoutNode =>
  attachSystemControlDock(
    S('h', 0.24, L('transcription'), S('h', 0.316, L('bubbleCloud'), S('h', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history'))))),
  )

export const makeVerticalLayout = (): LayoutNode =>
  attachSystemControlDock(
    S('v', 0.22, L('transcription'), S('v', 0.32, L('bubbleCloud'), S('v', 0.5, L('detail'), S('v', 0.5, L('importanceRanking'), L('history'))))),
  )

// ── 発表後フェーズのデフォルトレイアウト ──
export const makeAfterLayout = (): LayoutNode =>
  attachSystemControlDock(L('minutes'), 0.22)

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

// ── 操作ドック付きレイアウトのウィンドウ選択 ──

const DEFAULT_SOLO_INNER_WINDOW = 'transcription'

/** 左端が操作ウィンドウの横分割なら内側ツリーとドック比率を返す */
export function tryUnwrapSystemControlDock(layout: LayoutNode): { dockRatio: number; inner: LayoutNode } | null {
  if (layout.type !== 'split' || layout.direction !== 'h') return null
  if (layout.a.type === 'leaf' && layout.a.windowId === SYSTEM_CONTROL_WINDOW_ID) {
    return { dockRatio: layout.ratio, inner: layout.b }
  }
  return null
}

export function containsWindowId(node: LayoutNode, windowId: string): boolean {
  if (node.type === 'leaf') return node.windowId === windowId
  return containsWindowId(node.a, windowId) || containsWindowId(node.b, windowId)
}

/** レイアウトに含まれるユーザー領域のウィンドウ ID（操作ウィンドウ除く） */
export function collectUserWindowIdsInLayout(layout: LayoutNode): Set<string> {
  const ids = new Set<string>()
  const walk = (n: LayoutNode) => {
    if (n.type === 'leaf') {
      if (n.windowId !== SYSTEM_CONTROL_WINDOW_ID) ids.add(n.windowId)
    } else {
      walk(n.a)
      walk(n.b)
    }
  }
  walk(layout)
  return ids
}

/** 操作ウィンドウ以外で木の右側に近い葉の windowId（追加時の挿入基準） */
export function findRightmostUserLeafWindowId(node: LayoutNode): string | null {
  if (node.type === 'leaf') {
    return node.windowId === SYSTEM_CONTROL_WINDOW_ID ? null : node.windowId
  }
  const r = findRightmostUserLeafWindowId(node.b)
  if (r) return r
  return findRightmostUserLeafWindowId(node.a)
}

function ensureNonEmptyInner(inner: LayoutNode | null): LayoutNode {
  return inner ?? L(DEFAULT_SOLO_INNER_WINDOW)
}

/** ドック付きレイアウトからユーザー領域のウィンドウを 1 つ外す（内側が空なら文字起こしのみに戻す） */
export function removeUserWindowFromDockedLayout(layout: LayoutNode, windowId: string): LayoutNode {
  if (windowId === SYSTEM_CONTROL_WINDOW_ID) return layout
  const un = tryUnwrapSystemControlDock(layout)
  if (!un) {
    const next = removeLeaf(layout, windowId)
    return next ?? layout
  }
  const inner = ensureNonEmptyInner(removeLeaf(un.inner, windowId))
  return attachSystemControlDock(inner, un.dockRatio)
}

/** ドック付きレイアウトのユーザー領域にウィンドウを追加（既にあればそのまま） */
export function addUserWindowToDockedLayout(layout: LayoutNode, windowId: string): LayoutNode {
  if (windowId === SYSTEM_CONTROL_WINDOW_ID) return layout
  if (containsWindowId(layout, windowId)) return layout
  const un = tryUnwrapSystemControlDock(layout)
  if (!un) {
    const target = findRightmostUserLeafWindowId(layout) ?? DEFAULT_SOLO_INNER_WINDOW
    return insertLeaf(layout, target, windowId, 'right')
  }
  const target = findRightmostUserLeafWindowId(un.inner) ?? DEFAULT_SOLO_INNER_WINDOW
  const inner = insertLeaf(un.inner, target, windowId, 'right')
  return attachSystemControlDock(inner, un.dockRatio)
}

/** 単一ウィンドウの葉（レイアウト組み立て用） */
export function leafNode(windowId: string): LeafNode {
  return L(windowId)
}
