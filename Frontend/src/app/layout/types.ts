export type PanelId = 'transcription' | 'bubbleCloud' | 'detail' | 'history';
export type DropZone = 'left' | 'right' | 'top' | 'bottom';

let _counter = 0;
export const newId = () => `n${++_counter}`;

export interface LeafNode {
    type: 'leaf';
    id: string;
    panelId: PanelId;
}

export interface SplitNode {
    type: 'split';
    id: string;
    /** h = 左右分割, v = 上下分割 */
    direction: 'h' | 'v';
    /** 最初の子(a)が占める割合 0〜1 */
    ratio: number;
    a: LayoutNode;
    b: LayoutNode;
}

export type LayoutNode = LeafNode | SplitNode;
