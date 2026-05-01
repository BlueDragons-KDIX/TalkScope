import { registerWindow } from './registry'
import { TranscriptionWindow } from './TranscriptionWindow'
import { BubbleCloudWindow } from './BubbleCloudWindow'
import { TermDetailWindow } from './TermDetailWindow'
import { HistoryWindow } from './HistoryWindow'
import { MinutesWindow } from './MinutesWindow'

export function registerAllWindows(): void {
  registerWindow({ id: 'transcription', label: '文字起こし', component: TranscriptionWindow })
  registerWindow({ id: 'bubbleCloud',   label: '用語マップ',  component: BubbleCloudWindow })
  registerWindow({ id: 'detail',        label: '詳細',        component: TermDetailWindow })
  registerWindow({ id: 'history',       label: '履歴',        component: HistoryWindow })
  registerWindow({ id: 'minutes',       label: '議事録',      component: MinutesWindow })
}

export * from './registry'
export * from './IWindowDefinition'
