export type TranscriptionStatus = 'idle' | 'listening' | 'error'

export interface ITranscriptionService {
  getStatus(): TranscriptionStatus
  getTranscript(): string
  startListening(): void
  stopListening(): void
  clearTranscript(): void
}
