export type TranscriptionStatus = 'idle' | 'listening' | 'error'
export type MicrophoneDevice = {
  deviceId: string
  label: string
}

export interface ITranscriptionService {
  getStatus(): TranscriptionStatus
  getTranscript(): string
  startListening(): void
  stopListening(): void
  getAvailableMicrophones(): MicrophoneDevice[]
  getSelectedMicrophoneId(): string
  setSelectedMicrophone(deviceId: string): void
  refreshMicrophones(): Promise<void>
  clearTranscript(): void
  /** デモ・テスト用に全文を差し替え（音声入力とは独立） */
  setTranscriptExternal(text: string): void
}
