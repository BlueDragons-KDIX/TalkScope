/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_VECTOR_API_URL?: string;
  readonly VITE_TRANSCRIPTION_MODE_DEFAULT?: 'fast' | 'accurate';
  readonly VITE_LOCAL_STT_URL?: string;
  readonly VITE_TRANSCRIPT_UPLOAD_MODE?: 'disabled' | 'local' | 'remote';
  readonly VITE_TRANSCRIPT_UPLOAD_URL?: string;
  readonly VITE_VECTOR_OVERLAP_SENTENCES?: string;
  readonly VITE_VECTOR_SEND_EVERY_N_SENTENCES?: string;
  readonly VITE_VECTOR_SEND_INTERVAL_SEC?: string;
}
