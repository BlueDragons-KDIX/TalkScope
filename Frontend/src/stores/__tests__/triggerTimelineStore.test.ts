import { beforeEach, describe, expect, it } from 'bun:test'
import { useTriggerTimelineStore } from '../triggerTimelineStore'

describe('triggerTimelineStore', () => {
  beforeEach(() => {
    useTriggerTimelineStore.getState().clearLogs()
  })

  it('トリガーログを追加できる', () => {
    useTriggerTimelineStore.getState().appendLog({
      type: 'transcriptFinalized',
      summary: '文字起こし文を確定',
      detail: 'Reactについて説明します。',
    })

    const state = useTriggerTimelineStore.getState()
    expect(state.logs).toHaveLength(1)
    expect(state.logs[0]?.type).toBe('transcriptFinalized')
    expect(state.logs[0]?.occurredAt).toBeGreaterThan(0)
  })

  it('表示項目をチェックボックス向けに切り替えられる', () => {
    useTriggerTimelineStore.getState().toggleType('sseReceived')
    expect(useTriggerTimelineStore.getState().visibleTypes.sseReceived).toBe(false)
  })

  it('clearLogsで時系列ログを空にできる', () => {
    useTriggerTimelineStore.getState().appendLog({
      type: 'bubbleCreated',
      summary: 'バブル表示を更新',
      detail: 'Node.js / TypeScript',
    })
    useTriggerTimelineStore.getState().clearLogs()
    expect(useTriggerTimelineStore.getState().logs).toEqual([])
  })
})
