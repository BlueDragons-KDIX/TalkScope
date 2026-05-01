import { DropZone, LeafNode, LayoutNode, PanelId, SplitNode, newId } from './types';

// ── ファクトリ ──────────────────────────────────────
const L = (panelId: PanelId): LeafNode => ({ type: 'leaf', id: newId(), panelId });
const S = (direction: 'h' | 'v', ratio: number, a: LayoutNode, b: LayoutNode): SplitNode =>
    ({ type: 'split', id: newId(), direction, ratio, a, b });

/** デフォルト: 文字起こし(40%) | 用語マップ(35%) | [詳細(上)/履歴(下)](25%) */
export const makeDefaultLayout = (): LayoutNode =>
    S('h', 0.4, L('transcription'), S('h', 0.58, L('bubbleCloud'), S('v', 0.55, L('detail'), L('history'))));

/** 左半分: 文字起こし / 右半分を上下: 用語マップ(上) + 詳細+履歴(下) */
export const makeLeftRightLayout = (): LayoutNode =>
    S('h', 0.5,
        L('transcription'),
        S('v', 0.5, L('bubbleCloud'), S('h', 0.5, L('detail'), L('history')))
    );

/** 2×2 グリッド */
export const make2x2Layout = (): LayoutNode =>
    S('v', 0.5,
        S('h', 0.5, L('transcription'), L('bubbleCloud')),
        S('h', 0.5, L('detail'), L('history'))
    );

/** 横4列 */
export const makeHorizontalLayout = (): LayoutNode =>
    S('h', 0.25, L('transcription'),
        S('h', 0.333, L('bubbleCloud'),
            S('h', 0.5, L('detail'), L('history'))
        )
    );

/** 縦4列 */
export const makeVerticalLayout = (): LayoutNode =>
    S('v', 0.25, L('transcription'),
        S('v', 0.333, L('bubbleCloud'),
            S('v', 0.5, L('detail'), L('history'))
        )
    );

// ── ツリー操作 ──────────────────────────────────────

/** 指定 panelId を持つ LeafNode をツリーから除去。除去後空になる SplitNode は兄弟で置換。 */
export function removeLeaf(node: LayoutNode, panelId: PanelId): LayoutNode | null {
    if (node.type === 'leaf') return node.panelId === panelId ? null : node;
    const a = removeLeaf(node.a, panelId);
    const b = removeLeaf(node.b, panelId);
    if (a === null && b === null) return null;
    if (a === null) return b!;
    if (b === null) return a;
    return { ...node, a, b };
}

/** target パネルの zone 側に dragged パネルを挿入して新しい SplitNode を生成 */
export function insertLeaf(node: LayoutNode, targetId: PanelId, draggedId: PanelId, zone: DropZone): LayoutNode {
    if (node.type === 'leaf') {
        if (node.panelId !== targetId) return node;
        const dragged: LeafNode = { type: 'leaf', id: newId(), panelId: draggedId };
        const dir = zone === 'left' || zone === 'right' ? 'h' : 'v';
        const isFirst = zone === 'left' || zone === 'top';
        return { type: 'split', id: newId(), direction: dir, ratio: 0.5, a: isFirst ? dragged : node, b: isFirst ? node : dragged };
    }
    return { ...node, a: insertLeaf(node.a, targetId, draggedId, zone), b: insertLeaf(node.b, targetId, draggedId, zone) };
}

/** dragged パネルを target パネルの zone 側へ移動 */
export function movePanel(layout: LayoutNode, draggedId: PanelId, targetId: PanelId, zone: DropZone): LayoutNode {
    if (draggedId === targetId) return layout;
    const without = removeLeaf(layout, draggedId);
    if (!without) return layout;
    return insertLeaf(without, targetId, draggedId, zone);
}

/** splitId の SplitNode の ratio を更新 */
export function updateRatio(node: LayoutNode, splitId: string, ratio: number): LayoutNode {
    if (node.type === 'leaf') return node;
    if (node.id === splitId) return { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) };
    return { ...node, a: updateRatio(node.a, splitId, ratio), b: updateRatio(node.b, splitId, ratio) };
}
