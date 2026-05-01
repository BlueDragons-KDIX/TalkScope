import { describe, it, expect, beforeEach } from 'bun:test'
import { useTranscriptStore } from '../transcriptStore'

describe('transcriptStore', () => {
  beforeEach(() => {
    useTranscriptStore.setState({ transcript: '', status: 'idle' })
  })

  it('初期状態は空のテキストとidleステータス', () => {
    const { transcript, status } = useTranscriptStore.getState()
    expect(transcript).toBe('')
    expect(status).toBe('idle')
  })

  it('テキストを設定できる', () => {
    useTranscriptStore.getState().setTranscript('テスト発話。\n')
    expect(useTranscriptStore.getState().transcript).toBe('テスト発話。\n')
  })

  it('テキストをクリアできる', () => {
    useTranscriptStore.getState().setTranscript('テスト')
    useTranscriptStore.getState().clear()
    expect(useTranscriptStore.getState().transcript).toBe('')
  })

  it('ステータスを設定できる', () => {
    useTranscriptStore.getState().setStatus('listening')
    expect(useTranscriptStore.getState().status).toBe('listening')
  })
})
