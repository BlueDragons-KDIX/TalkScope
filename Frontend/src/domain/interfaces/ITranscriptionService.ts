export type TranscriptionStatus = 'idle' | 'listening' | 'error'

export interface ITranscriptionService {
  getStatus(): TranscriptionStatus
  getTranscript(): string
  startListening(): void
  stopListening(): void
  clearTranscript(): void
  /** デモ・テスト用に全文を差し替え（音声入力とは独立） */
  setTranscriptExternal(text: string): void
}
