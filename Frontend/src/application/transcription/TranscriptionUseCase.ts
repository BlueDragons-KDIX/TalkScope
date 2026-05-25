import type { ITranscriptionService } from '../../domain/interfaces/ITranscriptionService'
import { useTranscriptStore } from '../../stores/transcriptStore'

export class TranscriptionUseCase {
  constructor(private service: ITranscriptionService) {}

  start(): void {
    this.service.startListening()
    useTranscriptStore.getState().setStatus('listening')
  }

  stop(): void {
    this.service.stopListening()
    useTranscriptStore.getState().setStatus('idle')
  }

  clear(): void {
    this.service.clearTranscript()
    useTranscriptStore.getState().clear()
  }

  getTranscript(): string {
    return this.service.getTranscript()
  }

  syncToStore(): void {
    const transcript = this.service.getTranscript()
    const status = this.service.getStatus()
    useTranscriptStore.getState().setTranscript(transcript)
    useTranscriptStore.getState().setStatus(status)
  }
}
