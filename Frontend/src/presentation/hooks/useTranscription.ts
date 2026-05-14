import { useEffect, useRef, useState } from 'react'
import { WebSpeechTranscriptionService } from '../../infrastructure/speech/WebSpeechTranscriptionService'
import { LocalSttTranscriptionService } from '../../infrastructure/speech/LocalSttTranscriptionService'
import { useTranscriptStore } from '../../stores/transcriptStore'
import type { ITranscriptionService, MicrophoneDevice, TranscriptionMode } from '../../domain/interfaces/ITranscriptionService'

const MODE_STORAGE_KEY = 'talkscope.transcription.mode'
const DEFAULT_MODE: TranscriptionMode = (import.meta.env.VITE_TRANSCRIPTION_MODE_DEFAULT === 'accurate' ? 'accurate' : 'fast')
const services: Record<TranscriptionMode, ITranscriptionService> = {
  fast: new WebSpeechTranscriptionService(),
  accurate: new LocalSttTranscriptionService(),
}
let _mode: TranscriptionMode = DEFAULT_MODE

if (typeof window !== 'undefined') {
  const saved = window.localStorage.getItem(MODE_STORAGE_KEY)
  if (saved === 'fast' || saved === 'accurate') _mode = saved
}

export function getTranscriptionMode(): TranscriptionMode {
  return _mode
}

export function setTranscriptionMode(mode: TranscriptionMode): void {
  if (_mode === mode) return
  const prevService = services[_mode]
  prevService.stopListening()
  _mode = mode
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  }
}

/** アプリ全体で共有する現在モードの文字起こしサービス */
export function getTranscriptionService(): ITranscriptionService {
  return services[_mode]
}

export function useTranscription() {
  const setTranscript = useTranscriptStore(s => s.setTranscript)
  const setStatus = useTranscriptStore(s => s.setStatus)
  const transcript = useTranscriptStore(s => s.transcript)
  const status = useTranscriptStore(s => s.status)
  const [mode, setMode] = useState<TranscriptionMode>(getTranscriptionMode())
  const serviceRef = useRef<ITranscriptionService>(getTranscriptionService())
  const [microphones, setMicrophones] = useState<MicrophoneDevice[]>(serviceRef.current.getAvailableMicrophones())
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState(serviceRef.current.getSelectedMicrophoneId())

  useEffect(() => {
    const service = serviceRef.current
    void service.refreshMicrophones()
    const unsubscribe = service.subscribe(() => {
      setTranscript(service.getTranscript())
      setStatus(service.getStatus())
      setMicrophones(service.getAvailableMicrophones())
      setSelectedMicrophoneId(service.getSelectedMicrophoneId())
    })
    return unsubscribe
  }, [mode, setTranscript, setStatus])

  const changeMode = (nextMode: TranscriptionMode) => {
    setTranscriptionMode(nextMode)
    const nextService = getTranscriptionService()
    serviceRef.current = nextService
    setMode(nextMode)
    setTranscript(nextService.getTranscript())
    setStatus(nextService.getStatus())
    setMicrophones(nextService.getAvailableMicrophones())
    setSelectedMicrophoneId(nextService.getSelectedMicrophoneId())
    void nextService.refreshMicrophones()
  }

  return {
    mode,
    transcript,
    status,
    isListening: status === 'listening',
    microphones,
    selectedMicrophoneId,
    refreshMicrophones: () => serviceRef.current.refreshMicrophones(),
    selectMicrophone: (deviceId: string) => serviceRef.current.setSelectedMicrophone(deviceId),
    setMode: changeMode,
    startListening: () => serviceRef.current.startListening(),
    stopListening: () => serviceRef.current.stopListening(),
    clearTranscript: () => {
      serviceRef.current.clearTranscript()
      useTranscriptStore.getState().clear()
    },
  }
}
