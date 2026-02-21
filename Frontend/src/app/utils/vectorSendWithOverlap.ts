export interface VectorPayload {
  sentences: string[];
  startIndex: number;
  endIndex: number;
}

export function createVectorSendState(options: { overlapSentences: number }) {
  const { overlapSentences } = options;
  let lastSentEndIndex = 0;

  function buildPayload(sentences: string[]): VectorPayload | null {
    if (sentences.length === 0) return null;

    const endIndex = sentences.length;
    const overlap = Math.min(overlapSentences, lastSentEndIndex);
    const startIndex = Math.max(0, lastSentEndIndex - overlap);

    const payload: VectorPayload = {
      sentences: sentences.slice(startIndex, endIndex),
      startIndex,
      endIndex,
    };

    lastSentEndIndex = endIndex;
    return payload;
  }

  function reset(): void {
    lastSentEndIndex = 0;
  }

  function getLastSentEndIndex(): number {
    return lastSentEndIndex;
  }

  function setLastSentEndIndex(index: number): void {
    lastSentEndIndex = Math.max(0, index);
  }

  return { buildPayload, reset, getLastSentEndIndex, setLastSentEndIndex };
}

const VECTOR_API_PATH = '/analysis/vectorize';

export function getVectorApiUrl(baseUrl: string): string {
  const base = baseUrl?.trim() ?? '';
  if (!base) return VECTOR_API_PATH;
  try {
    return `${new URL(base).origin}${VECTOR_API_PATH}`;
  } catch {
    return `${base.replace(/\/$/, '')}${VECTOR_API_PATH}`;
  }
}

export async function sendVectorRequest(
  payload: VectorPayload,
  baseUrl: string
): Promise<unknown> {
  const url = getVectorApiUrl(baseUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: payload.sentences.join('\n') }),
  });
  if (!res.ok) {
    throw new Error(`Vector API error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
