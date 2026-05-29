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
    const rankingFocused = this.rankingFocusedPresentationSnapshot()
    const fullCustom = this.fullCustomPresentationSnapshot()
    return [
      this.template('バブル重視', bubbleFocused.layout, bubbleFocused),
      this.template('ランキング重視', rankingFocused.layout, rankingFocused),
      this.template('フルカスタム', fullCustom.layout, fullCustom),
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
      appearance: { darkMode: false, themeColor: 'indigo' },
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

  rankingFocusedPresentationSnapshot(): PresentationSnapshot {
    return {
      version: PRESENTATION_SNAPSHOT_VERSION,
      phaseId: 'during',
      layout: {
        type: 'split',
        id: 'n8',
        direction: 'h',
        ratio: 0.6873806275579809,
        a: {
          type: 'split',
          id: 'n24',
          direction: 'h',
          ratio: 0.45579180507407774,
          a: { type: 'leaf', id: 'n6', windowId: 'transcription' },
          b: { type: 'leaf', id: 'n23', windowId: 'importanceRanking' },
        },
        b: {
          type: 'split',
          id: 'n14',
          direction: 'v',
          ratio: 0.46088657105606257,
          a: { type: 'leaf', id: 'n17', windowId: 'detail' },
          b: { type: 'leaf', id: 'n13', windowId: 'history' },
        },
      },
      appearance: { darkMode: false, themeColor: 'emerald' },
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

  createImportanceListFocusedLayout(): LayoutNode {
    return this.rankingFocusedPresentationSnapshot().layout
  }

  fullCustomPresentationSnapshot(): PresentationSnapshot {
    return {
      version: PRESENTATION_SNAPSHOT_VERSION,
      phaseId: 'during',
      layout: {
        type: 'split',
        id: 'n19',
        direction: 'h',
        ratio: 0.3433833560709414,
        a: { type: 'leaf', id: 'n11', windowId: 'transcription' },
        b: {
          type: 'split',
          id: 'n10',
          direction: 'h',
          ratio: 0.5957925140419322,
          a: {
            type: 'split',
            id: 'n20',
            direction: 'v',
            ratio: 0.4726205997392438,
            a: { type: 'leaf', id: 'n12', windowId: 'bubbleCloud' },
            b: { type: 'leaf', id: 'n19', windowId: 'importanceRanking' },
          },
          b: {
            type: 'split',
            id: 'n16',
            direction: 'v',
            ratio: 0.42046936114732725,
            a: { type: 'leaf', id: 'n15', windowId: 'detail' },
            b: { type: 'leaf', id: 'n17', windowId: 'history' },
          },
        },
      },
      appearance: { darkMode: true, themeColor: 'rose' },
      contentFontScale: 1.1,
      floatingControlDock: {
        position: { x: 16, y: 676.8289184570312 },
        scale: 1.7396386718749999,
      },
      windowSettings: {
        bubbleCloud: {
          masterSizeScale: 0.8,
          bubbleSizeScale: 0.8,
          textFontSizePx: 15,
          autoSwitchEnabled: true,
          autoSwitchIntervalSec: 6,
          maxVisibleTerms: 15,
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

  createFullCustomLayout(): LayoutNode {
    return this.fullCustomPresentationSnapshot().layout
  }
}

export const getScriptableLayoutTemplates = (): ScriptableLayoutTemplate[] =>
  new ScriptableLayoutTemplates().templates()
