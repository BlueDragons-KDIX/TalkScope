import type { ITranscriptionService, TranscriptionStatus } from '../../domain/interfaces/ITranscriptionService'

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
  private status: TranscriptionStatus = 'idle'
  private recognition: any = null
  private isRunning = false
  private listeners = new Set<ChangeHandler>()

  constructor() {
    this.initRecognition()
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
      let current = ''
      for (let i = 0; i < event.results.length; i++) {
        const text: string = event.results[i][0].transcript
        current += event.results[i].isFinal ? text + '。\n' : text
      }
      this.transcript = current
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
    void this.uploadTranscript()
    this.notify()
  }

  clearTranscript(): void {
    this.transcript = ''
    this.notify()
  }

  setTranscriptExternal(text: string): void {
    this.transcript = text
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
