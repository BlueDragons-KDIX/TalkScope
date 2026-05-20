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
      this.template('発表中 サンプル', this.createDuringSampleLayout()),
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
          type: 'split',
          id: 'n28',
          direction: 'h',
          ratio: 0.3337005943421114,
          a: {
            type: 'leaf',
            id: 'n27',
            windowId: 'systemControl',
          },
          b: {
            type: 'leaf',
            id: 'n6',
            windowId: 'transcription',
          },
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
}

export const getScriptableLayoutTemplates = (): ScriptableLayoutTemplate[] =>
  new ScriptableLayoutTemplates().templates()
