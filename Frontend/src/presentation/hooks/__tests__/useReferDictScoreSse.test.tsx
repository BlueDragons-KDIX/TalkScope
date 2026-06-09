/// <reference lib="dom" />
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTranscriptStore } from '../../../stores/transcriptStore'

const streamReferDictScoresMock = mock(
  (_text: string, _options?: unknown) => Promise.resolve(),
)

mock.module('../../../infrastructure/sse/referDictScoreStream', () => ({
  streamReferDictScores: (text: string, options: unknown) =>
    streamReferDictScoresMock(text, options),
}))

const { useReferDictScoreSse } = await import('../useReferDictScoreSse')

const DEBOUNCE_MS = 30

function flushDebounce() {
  return new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS + 20))
}

function setTranscript(text: string) {
  useTranscriptStore.setState({ transcript: text })
}

describe('useReferDictScoreSse', () => {
  beforeEach(() => {
    useTranscriptStore.setState({ transcript: '', status: 'idle' })
    streamReferDictScoresMock.mockReset()
    streamReferDictScoresMock.mockImplementation(() => Promise.resolve())
  })

  it('句点で完了した文を streamReferDictScores に送る', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('量子計算について。')
    })

    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })
    expect(streamReferDictScoresMock).toHaveBeenCalledWith(
      '量子計算について',
      expect.objectContaining({ onChunk: expect.any(Function) }),
    )
  })

  it('複数の完了文を並列で送る', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('文1。文2。文3。')
    })

    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(3)
    })
    const texts = streamReferDictScoresMock.mock.calls.map(([text]) => text)
    expect(texts).toEqual(['文1', '文2', '文3'])
  })

  it('同じ transcript を再度セットしても完了文は再送しない', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('文1。文2。')
    })
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(2)
    })

    act(() => {
      setTranscript('文1。文2。')
    })
    await flushDebounce()

    expect(streamReferDictScoresMock).toHaveBeenCalledTimes(2)
  })

  it('末尾未完了文は debounce 後に 1 回送る', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('話し途中の文')
    })
    expect(streamReferDictScoresMock).toHaveBeenCalledTimes(0)

    await flushDebounce()

    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })
    expect(streamReferDictScoresMock).toHaveBeenCalledWith(
      '話し途中の文',
      expect.any(Object),
    )
  })

  it('debounce で送った末尾文と同じ text は再送しない', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('話し途中の文')
    })
    await flushDebounce()
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      setTranscript('話し途中の文 ')
    })
    act(() => {
      setTranscript('話し途中の文')
    })
    await flushDebounce()

    expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
  })

  it('句点除去後に同じ本文の文が複数あっても 1 回だけ送る', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('はい。はい。')
    })

    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })
    expect(streamReferDictScoresMock).toHaveBeenCalledWith('はい', expect.any(Object))
  })

  it('debounce 送信開始直後の句点確定でも二重送信しない', async () => {
    let releaseStream!: () => void
    const pending = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    streamReferDictScoresMock.mockImplementation(() => pending)

    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('話し途中の文')
    })
    await flushDebounce()
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      setTranscript('話し途中の文。')
    })
    await flushDebounce()

    expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    releaseStream()
  })

  it('接続中の同じ text は二重に開かない', async () => {
    let releaseFirst!: () => void
    const firstDone = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    streamReferDictScoresMock.mockImplementation((text: string) => {
      if (text === '話し途中の文') return firstDone
      return Promise.resolve()
    })

    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('話し途中の文')
    })
    await flushDebounce()
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      setTranscript('話し途中の文x')
    })
    act(() => {
      setTranscript('話し途中の文')
    })
    await flushDebounce()

    expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)

    releaseFirst()
  })

  it('transcript クリア後は再度送れる', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('文1。')
    })
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      setTranscript('')
    })
    act(() => {
      setTranscript('文2。')
    })
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(2)
    })
    expect(streamReferDictScoresMock).toHaveBeenLastCalledWith('文2', expect.any(Object))
  })

  it('debounce 後に句点だけ付いた完了文は再送しない', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('話し途中の文')
    })
    await flushDebounce()
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })
    expect(streamReferDictScoresMock).toHaveBeenCalledWith('話し途中の文', expect.any(Object))

    act(() => {
      setTranscript('話し途中の文。')
    })
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })
  })

  it('追記後に句点で確定した文は再送する', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      setTranscript('話し途中')
    })
    await flushDebounce()
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })

    act(() => {
      setTranscript('話し途中の文。')
    })
    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(2)
    })
    expect(streamReferDictScoresMock).toHaveBeenLastCalledWith('話し途中の文', expect.any(Object))
  })

  it('2 文字未満の文は送らずインデックスだけ進める', async () => {
    renderHook(() => useReferDictScoreSse({ trailingDebounceMs: DEBOUNCE_MS }))

    act(() => {
      // 「。」のみは trim 後 1 文字のため API に送らない
      setTranscript('。いいい。')
    })

    await waitFor(() => {
      expect(streamReferDictScoresMock).toHaveBeenCalledTimes(1)
    })
    expect(streamReferDictScoresMock).toHaveBeenCalledWith('いいい', expect.any(Object))
  })
})
