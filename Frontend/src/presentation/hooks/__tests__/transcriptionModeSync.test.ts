import { describe, it, expect, beforeEach } from 'bun:test'
import {
  getTranscriptionMode,
  getTranscriptionService,
  setTranscriptionMode,
} from '../useTranscription'
import { WebSpeechTranscriptionService } from '../../../infrastructure/speech/WebSpeechTranscriptionService'
import { LocalSttTranscriptionService } from '../../../infrastructure/speech/LocalSttTranscriptionService'
import { useTranscriptStore } from '../../../stores/transcriptStore'

describe('transcription mode / service 同期 (PR #27)', () => {
  beforeEach(() => {
    setTranscriptionMode('fast')
    useTranscriptStore.setState({ transcript: '', status: 'idle' })
  })

  it('getTranscriptionService は fast で WebSpeech 実装を返す', () => {
    const svc = getTranscriptionService()
    expect(svc).toBeInstanceOf(WebSpeechTranscriptionService)
    expect(getTranscriptionMode()).toBe('fast')
  })

  it('setTranscriptionMode で accurate に切替えると LocalStt が返る', () => {
    setTranscriptionMode('accurate')
    expect(getTranscriptionMode()).toBe('accurate')
    expect(getTranscriptionService()).toBeInstanceOf(LocalSttTranscriptionService)
  })

  it('往復で同じインスタンスに戻る（シングルトン）', () => {
    const fastA = getTranscriptionService()
    setTranscriptionMode('accurate')
    setTranscriptionMode('fast')
    const fastB = getTranscriptionService()
    expect(fastB).toBe(fastA)
  })

  it('同一モードへの set は no-op で例外にならない', () => {
    setTranscriptionMode('fast')
    setTranscriptionMode('fast')
    expect(getTranscriptionMode()).toBe('fast')
  })
})
