import { useEffect, useRef } from 'react'
import { WebSpeechTranscriptionService } from '../../infrastructure/speech/WebSpeechTranscriptionService'
import { useTranscriptStore } from '../../stores/transcriptStore'

// シングルトンサービス（アプリ全体で一つ）
let _service: WebSpeechTranscriptionService | null = null
const getService = () => {
  if (!_service) _service = new WebSpeechTranscriptionService()
  return _service
}

export function useTranscription() {
  const setTranscript = useTranscriptStore(s => s.setTranscript)
  const setStatus = useTranscriptStore(s => s.setStatus)
  const transcript = useTranscriptStore(s => s.transcript)
  const status = useTranscriptStore(s => s.status)
  const serviceRef = useRef(getService())

  useEffect(() => {
    const service = serviceRef.current
    const unsubscribe = service.subscribe(() => {
      setTranscript(service.getTranscript())
      setStatus(service.getStatus())
    })
    return unsubscribe
  }, [setTranscript, setStatus])

  return {
    transcript,
    status,
    isListening: status === 'listening',
    startListening: () => serviceRef.current.startListening(),
    stopListening: () => serviceRef.current.stopListening(),
    clearTranscript: () => {
      serviceRef.current.clearTranscript()
      useTranscriptStore.getState().clear()
    },
  }
}
