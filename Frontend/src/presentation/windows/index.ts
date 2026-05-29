import { registerWindow } from './registry'
import { TranscriptionWindow } from './TranscriptionWindow'
import { BubbleCloudWindow } from './BubbleCloudWindow'
import { TermDetailWindow } from './TermDetailWindow'
import { HistoryWindow } from './HistoryWindow'
import { MinutesWindow } from './MinutesWindow'
import { ImportanceRankingWindow } from './ImportanceRankingWindow'
import { PipelineDebugWindow } from './PipelineDebugWindow'
import { TriggerTimelineWindow } from './TriggerTimelineWindow'

export function registerAllWindows(): void {
  registerWindow({ id: 'transcription', label: '文字起こし', component: TranscriptionWindow })
  registerWindow({ id: 'bubbleCloud',   label: '用語マップ',  component: BubbleCloudWindow })
  registerWindow({ id: 'detail',        label: '詳細',        component: TermDetailWindow })
  registerWindow({ id: 'history',       label: '履歴',        component: HistoryWindow })
  registerWindow({ id: 'importanceRanking', label: '重要度',  component: ImportanceRankingWindow })
  registerWindow({ id: 'minutes',       label: '議事録',      component: MinutesWindow })
  registerWindow({ id: 'pipelineDebug', label: 'SSE可視化',   component: PipelineDebugWindow })
  registerWindow({ id: 'triggerTimeline', label: '時系列トリガー', component: TriggerTimelineWindow })
}

export * from './registry'
export * from './IWindowDefinition'
