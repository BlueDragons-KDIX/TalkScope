import type { LayoutNode } from '../../domain/entities/Layout'
import {
  PRESENTATION_SNAPSHOT_VERSION,
  type PresentationSnapshot,
} from './presentationSnapshot'

export interface ScriptableLayoutTemplate {
  id: string
  name: string
  layout: LayoutNode
  /** ある場合、選択時にレイアウト以外の設定もまとめて反映 */
  snapshot?: PresentationSnapshot
}

/**
 * 手作業で育てるレイアウトテンプレート置き場。
 *
 * 使い方:
 * 1. アプリ上部の「テスト」から現在のレイアウトをコピーする。
 * 2. 下の `templates()` に `this.template('表示名', layout, snapshot?)` を追加する。
 * 3. テストからコピーした JSON を `PresentationSnapshot` として貼り付け、`layout` はその `layout` フィールドを使う。
 *
 * ここに追加したテンプレートは、アプリ上部の「レイアウト」ボタンに表示される。
 */
export class ScriptableLayoutTemplates {
  templates(): ScriptableLayoutTemplate[] {
    const bubbleFocused = this.bubbleFocusedPresentationSnapshot()
    return [
      this.template('バブル重視', bubbleFocused.layout, bubbleFocused),
      this.template('ランキング重視', this.createImportanceListFocusedLayout()),
      this.template('フルカスタム', this.createFullCustomLayout()),
    ]
  }

  template(
    name: string,
    layout: LayoutNode,
    snapshot?: PresentationSnapshot,
  ): ScriptableLayoutTemplate {
    return {
      id: `scriptable:${name}`,
      name,
      layout,
      snapshot,
    }
  }

  createDuringSampleLayout(): LayoutNode {
    return {
      type: 'split',
      id: 'n8',
      direction: 'h',
      ratio: 0.4625272228804147,
      a: {
        type: 'split',
        id: 'n22',
        direction: 'v',
        ratio: 0.5026075619295959,
        a: {
          type: 'leaf',
          id: 'n6',
          windowId: 'transcription',
        },
        b: {
          type: 'leaf',
          id: 'n21',
          windowId: 'detail',
        },
      },
      b: {
        type: 'split',
        id: 'n26',
        direction: 'h',
        ratio: 0.5504976239576795,
        a: {
          type: 'leaf',
          id: 'n7',
          windowId: 'bubbleCloud',
        },
        b: {
          type: 'leaf',
          id: 'n25',
          windowId: 'importanceRanking',
        },
      },
    }
  }

  bubbleFocusedPresentationSnapshot(): PresentationSnapshot {
    return {
      version: PRESENTATION_SNAPSHOT_VERSION,
      phaseId: 'during',
      layout: {
        type: 'split',
        id: 'n8',
        direction: 'h',
        ratio: 0.3210777626193725,
        a: { type: 'leaf', id: 'n6', windowId: 'transcription' },
        b: {
          type: 'split',
          id: 'n18',
          direction: 'h',
          ratio: 0.5060604625837456,
          a: { type: 'leaf', id: 'n7', windowId: 'bubbleCloud' },
          b: {
            type: 'split',
            id: 'n10',
            direction: 'v',
            ratio: 0.4061277705345502,
            a: { type: 'leaf', id: 'n17', windowId: 'detail' },
            b: { type: 'leaf', id: 'n9', windowId: 'history' },
          },
        },
      },
      appearance: { darkMode: true, themeColor: 'indigo' },
      contentFontScale: 1.1,
      floatingControlDock: {
        position: { x: 634.95703125, y: 685.3671875 },
        scale: 1.44482421875,
      },
      windowSettings: {
        bubbleCloud: {
          masterSizeScale: 0.8,
          bubbleSizeScale: 0.8,
          textFontSizePx: 15,
          autoSwitchEnabled: false,
          autoSwitchIntervalSec: 6,
          maxVisibleTerms: 30,
        },
        transcription: {
          masterFontScale: 1,
          plainTextFontSizePx: 14,
          importantTermFontSizePx: 16,
        },
        detail: { fontSizePx: 10 },
        importanceRanking: {
          masterSizeScale: 1,
          fontSizePx: 16,
          visibleCount: 10,
        },
        history: { fontSizePx: 10 },
      },
    }
  }

  createBubbleFocusedLayout(): LayoutNode {
    return this.bubbleFocusedPresentationSnapshot().layout
  }

  createImportanceListFocusedLayout(): LayoutNode {
    return {
      type: 'split',
      id: 'n8',
      direction: 'h',
      ratio: 0.6873806275579809,
      a: {
        type: 'split',
        id: 'n24',
        direction: 'h',
        ratio: 0.43989426965781536,
        a: {
          type: 'leaf',
          id: 'n6',
          windowId: 'transcription',
        },
        b: {
          type: 'leaf',
          id: 'n23',
          windowId: 'importanceRanking',
        },
      },
      b: {
        type: 'leaf',
        id: 'n17',
        windowId: 'detail',
      },
    }
  }

  createFullCustomLayout(): LayoutNode {
    return {
      type: 'split',
      id: 'n19',
      direction: 'h',
      ratio: 0.4,
      a: {
        type: 'leaf',
        id: 'n11',
        windowId: 'transcription',
      },
      b: {
        type: 'split',
        id: 'n18',
        direction: 'v',
        ratio: 0.38,
        a: {
          type: 'leaf',
          id: 'n12',
          windowId: 'bubbleCloud',
        },
        b: {
          type: 'split',
          id: 'n17',
          direction: 'h',
          ratio: 0.5,
          a: {
            type: 'leaf',
            id: 'n13',
            windowId: 'detail',
          },
          b: {
            type: 'split',
            id: 'n16',
            direction: 'v',
            ratio: 0.5,
            a: {
              type: 'leaf',
              id: 'n14',
              windowId: 'importanceRanking',
            },
            b: {
              type: 'leaf',
              id: 'n15',
              windowId: 'history',
            },
          },
        },
      },
    }
  }
}

export const getScriptableLayoutTemplates = (): ScriptableLayoutTemplate[] =>
  new ScriptableLayoutTemplates().templates()
