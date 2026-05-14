/// <reference lib="dom" />
import React from 'react'
import { describe, it, expect, beforeEach } from 'bun:test'
import { render, act } from '@testing-library/react'
import { useTranscription, setTranscriptionMode } from '../useTranscription'
import { useTranscriptStore } from '../../../stores/transcriptStore'

function ModeLabel() {
  const { mode } = useTranscription()
  return <span data-testid="mode-label">{mode}</span>
}

describe('useTranscription 結合: モード購読の共有 (PR #27)', () => {
  beforeEach(() => {
    setTranscriptionMode('fast')
    useTranscriptStore.setState({ transcript: '', status: 'idle' })
  })

  it('同一ツリー内の複数コンポーネントが setTranscriptionMode に追従する', () => {
    const view = render(
      <div>
        <ModeLabel />
        <ModeLabel />
      </div>,
    )
    expect(view.getAllByTestId('mode-label').every((el) => el.textContent === 'fast')).toBe(true)

    act(() => {
      setTranscriptionMode('accurate')
    })

    const labels = view.getAllByTestId('mode-label')
    expect(labels).toHaveLength(2)
    expect(labels.every((el) => el.textContent === 'accurate')).toBe(true)

    act(() => {
      setTranscriptionMode('fast')
    })
    expect(labels.every((el) => el.textContent === 'fast')).toBe(true)
  })
})
