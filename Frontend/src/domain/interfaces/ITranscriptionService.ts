export type TranscriptionStatus = 'idle' | 'listening' | 'paused' | 'error'
export type TranscriptionMode = 'fast' | 'accurate'
export type MicrophoneDevice = {
  deviceId: string
  label: string
}

export interface ITranscriptionService {
  getStatus(): TranscriptionStatus
  getTranscript(): string
  startListening(): void
  stopListening(): void
  pauseListening(): void
  getAvailableMicrophones(): MicrophoneDevice[]
  getSelectedMicrophoneId(): string
  setSelectedMicrophone(deviceId: string): void
  refreshMicrophones(): Promise<void>
  clearTranscript(): void
  /** デモ・テスト用に全文を差し替え（音声入力とは独立） */
  setTranscriptExternal(text: string): void
  /** 書き起こし・ステータス・マイク一覧の変更通知（購読解除関数を返す） */
  subscribe(listener: () => void): () => void
}
