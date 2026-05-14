import type { ITranscriptionService, MicrophoneDevice, TranscriptionStatus } from '../../domain/interfaces/ITranscriptionService'

type ChangeHandler = () => void

const DEFAULT_LOCAL_STT_URL = 'http://127.0.0.1:8765/transcribe'

export class LocalSttTranscriptionService implements ITranscriptionService {
  private transcript = ''
  private status: TranscriptionStatus = 'idle'
  private isRunning = false
  private microphones: MicrophoneDevice[] = []
  private selectedMicrophoneId = ''
  private selectedMicStream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private listeners = new Set<ChangeHandler>()

  constructor() {
    void this.refreshMicrophones()
  }

  private getLocalSttUrl(): string {
    const raw = import.meta.env.VITE_LOCAL_STT_URL
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    return trimmed || DEFAULT_LOCAL_STT_URL
  }

  private getRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
    ]
    return candidates.find((t) => MediaRecorder.isTypeSupported(t))
  }

  getStatus(): TranscriptionStatus {
    return this.status
  }

  getTranscript(): string {
    return this.transcript
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

  startListening(): void {
    if (this.isRunning) return
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.status = 'error'
      this.notify()
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      this.status = 'error'
      this.notify()
      return
    }

    this.status = 'listening'
    this.isRunning = true
    this.chunks = []
    this.notify()

    void (async () => {
      try {
        const constraints = this.selectedMicrophoneId
          ? { audio: { deviceId: { exact: this.selectedMicrophoneId } } }
          : { audio: true }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        this.selectedMicStream?.getTracks().forEach(track => track.stop())
        this.selectedMicStream = stream

        const mimeType = this.getRecorderMimeType()
        this.recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)

        this.recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) this.chunks.push(event.data)
        }
        this.recorder.onerror = () => {
          this.status = 'error'
          this.isRunning = false
          this.releaseResources()
          this.notify()
        }
        this.recorder.onstop = () => {
          void this.transcribeRecordedAudio()
        }
        this.recorder.start()
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[local-stt] start failed', err)
        this.status = 'error'
        this.isRunning = false
        this.releaseResources()
        this.notify()
      }
    })()
  }

  stopListening(): void {
    if (!this.isRunning) return
    this.isRunning = false
    this.status = 'idle'
    this.notify()
    try {
      this.recorder?.stop()
    } catch {
      this.releaseResources()
    }
  }

  clearTranscript(): void {
    this.transcript = ''
    this.notify()
  }

  setTranscriptExternal(text: string): void {
    this.transcript = text
    this.notify()
  }

  subscribe(handler: ChangeHandler): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  private async transcribeRecordedAudio(): Promise<void> {
    const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' })
    this.releaseResources()
    this.chunks = []
    if (blob.size === 0) return

    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')
    formData.append('language', 'ja')

    try {
      const res = await fetch(this.getLocalSttUrl(), {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.warn('[local-stt] transcribe failed', res.status, await res.text())
        }
        this.status = 'error'
        this.notify()
        return
      }
      const data = await res.json() as { text?: string }
      this.transcript = (data.text ?? '').trim()
      this.notify()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[local-stt] request failed', err)
      this.status = 'error'
      this.notify()
    }
  }

  private releaseResources(): void {
    this.recorder = null
    this.selectedMicStream?.getTracks().forEach(track => track.stop())
    this.selectedMicStream = null
  }

  private notify(): void {
    this.listeners.forEach(fn => fn())
  }
}

