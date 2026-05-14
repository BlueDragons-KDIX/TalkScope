import type { ITranscriptionService, MicrophoneDevice, TranscriptionStatus } from '../../domain/interfaces/ITranscriptionService'

type ChangeHandler = () => void
type TranscriptUploadMode = 'disabled' | 'local' | 'remote'
type UploadTranscriptPayload = {
  transcript: string
  language: string
  recordedAt: string
}

const DEFAULT_TRANSCRIPT_UPLOAD_URL = 'http://localhost:8000/transcript'
const DEFAULT_UPLOAD_MODE: TranscriptUploadMode = 'disabled'

export class WebSpeechTranscriptionService implements ITranscriptionService {
  private transcript = ''
  private finalTranscript = ''
  private interimTranscript = ''
  private finalizedResultIndices = new Set<number>()
  private status: TranscriptionStatus = 'idle'
  private recognition: any = null
  private isRunning = false
  private microphones: MicrophoneDevice[] = []
  private selectedMicrophoneId = ''
  private selectedMicStream: MediaStream | null = null
  private listeners = new Set<ChangeHandler>()

  constructor() {
    this.initRecognition()
    void this.refreshMicrophones()
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') {
      this.status = 'error'
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      this.status = 'error'
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'ja-JP'

    recognition.onstart = () => {
      this.isRunning = true
      this.status = 'listening'
      this.notify()
    }

    recognition.onresult = (event: any) => {
      let nextInterim = ''
      const start = typeof event.resultIndex === 'number' ? event.resultIndex : 0

      for (let i = start; i < event.results.length; i++) {
        const result = event.results[i]
        const text: string = result?.[0]?.transcript ?? ''
        const normalized = text.trim()
        if (!normalized) continue

        if (result.isFinal) {
          // 同じ result index の確定文を重複追加しない
          if (!this.finalizedResultIndices.has(i)) {
            this.finalTranscript += `${normalized}。\n`
            this.finalizedResultIndices.add(i)
          }
        } else {
          nextInterim += text
        }
      }

      // 不正確でも文字を残したい要件のため、途中文字列が短くなる更新では縮めない
      const nextInterimTrimmed = nextInterim.trim()
      if (nextInterimTrimmed.length >= this.interimTranscript.trim().length) {
        this.interimTranscript = nextInterim
      }
      this.transcript = `${this.finalTranscript}${this.interimTranscript}`
      this.notify()
    }

    recognition.onerror = () => {
      this.status = 'error'
      this.isRunning = false
      this.notify()
    }

    recognition.onend = () => {
      if (this.isRunning) {
        try { recognition.start() } catch { /* ignore */ }
      }
    }

    this.recognition = recognition
  }

  private getUploadUrl(): string {
    const raw = import.meta.env.VITE_TRANSCRIPT_UPLOAD_URL
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    return trimmed || DEFAULT_TRANSCRIPT_UPLOAD_URL
  }

  private getUploadMode(): TranscriptUploadMode {
    const raw = import.meta.env.VITE_TRANSCRIPT_UPLOAD_MODE
    const mode = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
    if (mode === 'local' || mode === 'remote' || mode === 'disabled') {
      return mode
    }
    return DEFAULT_UPLOAD_MODE
  }

  private buildUploadPayload(): UploadTranscriptPayload | null {
    const text = this.transcript.trim()
    if (!text) return null
    return {
      transcript: text,
      language: 'ja-JP',
      recordedAt: new Date().toISOString(),
    }
  }

  private async uploadTranscript(): Promise<void> {
    const mode = this.getUploadMode()
    if (mode === 'disabled') {
      if (import.meta.env.DEV) {
        console.log('[transcription] upload skipped (mode=disabled)')
      }
      return
    }
    const payload = this.buildUploadPayload()
    if (!payload) return
    const url = this.getUploadUrl()
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok && import.meta.env.DEV) {
        console.warn('[transcription] upload failed', res.status, await res.text())
      } else if (import.meta.env.DEV) {
        console.log(`[transcription] upload success (mode=${mode})`, url)
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[transcription] upload error', error)
      }
    }
  }

  getAvailableMicrophones(): MicrophoneDevice[] {
    return this.microphones
  }

  getSelectedMicrophoneId(): string {
    return this.selectedMicrophoneId
  }

  setSelectedMicrophone(deviceId: string): void {
    this.selectedMicrophoneId = deviceId
    this.notify()
  }

  async refreshMicrophones(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      this.microphones = []
      this.selectedMicrophoneId = ''
      this.notify()
      return
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `マイク ${i + 1}`,
        }))
      this.microphones = audioInputs
      if (!audioInputs.some(d => d.deviceId === this.selectedMicrophoneId)) {
        this.selectedMicrophoneId = audioInputs[0]?.deviceId ?? ''
      }
      this.notify()
    } catch {
      this.microphones = []
      this.selectedMicrophoneId = ''
      this.notify()
    }
  }

  private async prepareSelectedMicrophone(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    if (!this.selectedMicrophoneId) return
    try {
      this.selectedMicStream?.getTracks().forEach(track => track.stop())
      this.selectedMicStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: this.selectedMicrophoneId } },
      })
      await this.refreshMicrophones()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[transcription] selected mic prepare failed', err)
    }
  }

  private releaseSelectedMicrophone(): void {
    this.selectedMicStream?.getTracks().forEach(track => track.stop())
    this.selectedMicStream = null
  }

  getStatus(): TranscriptionStatus {
    return this.status
  }

  getTranscript(): string {
    return this.transcript
  }

  startListening(): void {
    if (this.isRunning) return
    if (!this.recognition) this.initRecognition()
    if (!this.recognition) {
      this.status = 'error'
      this.notify()
      return
    }

    this.status = 'listening'
    this.isRunning = true
    void this.prepareSelectedMicrophone()
    try {
      this.recognition.start()
    } catch {
      // ブラウザ状態で start() が失敗するケースがあるため、1回だけ再初期化して再試行する。
      this.initRecognition()
      if (!this.recognition) {
        this.status = 'error'
        this.isRunning = false
        this.notify()
        return
      }
      try {
        this.recognition.start()
      } catch {
        this.status = 'error'
        this.isRunning = false
      }
    }
    this.notify()
  }

  stopListening(): void {
    if (!this.recognition || !this.isRunning) return
    this.isRunning = false
    this.status = 'idle'
    try { this.recognition.stop() } catch { /* ignore */ }
    this.releaseSelectedMicrophone()
    void this.uploadTranscript()
    this.notify()
  }

  pauseListening(): void {
    if (!this.recognition || !this.isRunning) return
    this.isRunning = false
    this.status = 'paused'
    try { this.recognition.stop() } catch { /* ignore */ }
    this.releaseSelectedMicrophone()
    this.notify()
  }

  clearTranscript(): void {
    this.transcript = ''
    this.finalTranscript = ''
    this.interimTranscript = ''
    this.finalizedResultIndices.clear()
    this.notify()
  }

  setTranscriptExternal(text: string): void {
    this.transcript = text
    this.finalTranscript = text
    this.interimTranscript = ''
    this.finalizedResultIndices.clear()
    this.notify()
  }

  /** React hook から変更を購読するための登録 */
  subscribe(handler: ChangeHandler): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  private notify(): void {
    this.listeners.forEach(fn => fn())
  }
}
