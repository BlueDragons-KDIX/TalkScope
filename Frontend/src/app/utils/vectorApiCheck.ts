import { sendVectorRequest, getVectorApiUrl, type VectorPayload } from './vectorSendWithOverlap';

const TEST_PAYLOAD: VectorPayload = {
  sentences: ['接続確認用テスト文。'],
  startIndex: 0,
  endIndex: 1,
};

export type VectorApiCheckResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function checkVectorApi(): Promise<VectorApiCheckResult> {
  const baseUrl = getVectorApiBaseUrl();
  const url = getVectorApiUrl(baseUrl);
  try {
    await sendVectorRequest(TEST_PAYLOAD, baseUrl);
    return { ok: true, url };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}

function getVectorApiBaseUrl(): string {
  const back = import.meta.env.VITE_BACKEND_URL;
  const vec = import.meta.env.VITE_VECTOR_API_URL;
  const url = (typeof back === 'string' ? back.trim() : '') || (typeof vec === 'string' ? vec.trim() : '');
  return url || '';
}
