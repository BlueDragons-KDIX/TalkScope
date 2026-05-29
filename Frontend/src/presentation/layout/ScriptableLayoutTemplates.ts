import type { LayoutNode } from '../../domain/entities/Layout'

export interface ScriptableLayoutTemplate {
  id: string
  name: string
  layout: LayoutNode
}

/**
 * 手作業で育てるレイアウトテンプレート置き場。
 *
 * 使い方:
 * 1. アプリ上部の「テスト」から現在のレイアウトをコピーする。
 * 2. 下の `templates()` の配列に `this.template('表示名', this.createXxxLayout())` を追加する。
 * 3. コピーした `createXxxLayout(): LayoutNode { ... }` メソッドをこのクラス内に貼り付ける。
 *
 * ここに追加したテンプレートは、アプリ上部の「レイアウト」ボタンに表示される。
 */
export class ScriptableLayoutTemplates {
  templates(): ScriptableLayoutTemplate[] {
    return [
      this.template('デフォルト', this.createDuringSampleLayout()),
      this.template('バブル重視', this.createBubbleFocusedLayout()),
      this.template('重要リスト重視', this.createImportanceListFocusedLayout()),
      this.template('フルカスタム', this.createFullCustomLayout()),
    ]
  }

  template(name: string, layout: LayoutNode): ScriptableLayoutTemplate {
    return {
      id: `scriptable:${name}`,
      name,
      layout,
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

  createBubbleFocusedLayout(): LayoutNode {
    return {
      type: 'split',
      id: 'n8',
      direction: 'h',
      ratio: 0.3210777626193725,
      a: {
        type: 'leaf',
        id: 'n6',
        windowId: 'transcription',
      },
      b: {
        type: 'split',
        id: 'n18',
        direction: 'h',
        ratio: 0.5060604625837456,
        a: {
          type: 'leaf',
          id: 'n7',
          windowId: 'bubbleCloud',
        },
        b: {
          type: 'leaf',
          id: 'n17',
          windowId: 'detail',
        },
      },
    }
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
