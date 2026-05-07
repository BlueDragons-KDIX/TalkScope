import { useEffect, useRef, useState } from 'react'
import { WebSpeechTranscriptionService } from '../../infrastructure/speech/WebSpeechTranscriptionService'
import { useTranscriptStore } from '../../stores/transcriptStore'
import type { MicrophoneDevice } from '../../domain/interfaces/ITranscriptionService'

// シングルトンサービス（アプリ全体で一つ）
let _service: WebSpeechTranscriptionService | null = null

/** アプリ全体で共有する文字起こしサービス（デモツールバーなどフック外からも利用） */
export function getTranscriptionService(): WebSpeechTranscriptionService {
  if (!_service) _service = new WebSpeechTranscriptionService()
  return _service
}

export function useTranscription() {
  const setTranscript = useTranscriptStore(s => s.setTranscript)
  const setStatus = useTranscriptStore(s => s.setStatus)
  const transcript = useTranscriptStore(s => s.transcript)
  const status = useTranscriptStore(s => s.status)
  const serviceRef = useRef(getTranscriptionService())
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
  }, [setTranscript, setStatus])

  return {
    transcript,
    status,
    isListening: status === 'listening',
    microphones,
    selectedMicrophoneId,
    refreshMicrophones: () => serviceRef.current.refreshMicrophones(),
    selectMicrophone: (deviceId: string) => serviceRef.current.setSelectedMicrophone(deviceId),
    startListening: () => serviceRef.current.startListening(),
    stopListening: () => serviceRef.current.stopListening(),
    clearTranscript: () => {
      serviceRef.current.clearTranscript()
      useTranscriptStore.getState().clear()
    },
  }
}
