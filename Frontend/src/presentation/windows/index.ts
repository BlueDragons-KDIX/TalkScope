import { registerWindow } from './registry'
import { TranscriptionWindow } from './TranscriptionWindow'
import { BubbleCloudWindow } from './BubbleCloudWindow'
import { TermDetailWindow } from './TermDetailWindow'
import { HistoryWindow } from './HistoryWindow'
import { MinutesWindow } from './MinutesWindow'
import { ImportanceRankingWindow } from './ImportanceRankingWindow'
import { SystemControlWindow } from './SystemControlWindow'
import { SYSTEM_CONTROL_WINDOW_ID } from '../constants/systemControlWindow'

export function registerAllWindows(): void {
  registerWindow({
    id: SYSTEM_CONTROL_WINDOW_ID,
    label: '操作',
    component: SystemControlWindow,
    closable: false,
  })
  registerWindow({ id: 'transcription', label: '文字起こし', component: TranscriptionWindow })
  registerWindow({ id: 'bubbleCloud',   label: '用語マップ',  component: BubbleCloudWindow })
  registerWindow({ id: 'detail',        label: '詳細',        component: TermDetailWindow })
  registerWindow({ id: 'history',       label: '履歴',        component: HistoryWindow })
  registerWindow({ id: 'importanceRanking', label: '重要度',  component: ImportanceRankingWindow })
  registerWindow({ id: 'minutes',       label: '議事録',      component: MinutesWindow })
}

export * from './registry'
export * from './IWindowDefinition'
