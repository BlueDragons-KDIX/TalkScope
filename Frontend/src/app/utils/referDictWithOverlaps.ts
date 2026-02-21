// ── API レスポンス型 ─────────────────────────────────────────
/** Backend の ReferDictionaryEntry に対応 */
export interface ReferDictEntry {
  term: string;
  description: string;
  meaning_vector: number[] | null;
  source: 'db' | 'llm' | string;
}

/** Backend の ReferDictionaryResponse に対応 */
export interface ReferDictResponse {
  text: string;
  entries: ReferDictEntry[];
}

// ── ペイロード ────────────────────────────────────────────────
export interface ReferDictPayload {
  /** 送信する 1 文 */
  text: string;
  /** sentences 配列中のインデックス */
  sentenceIndex: number;
}

// ── ステート管理（vectorSendWithOverlap と同パターン） ─────────
export function createReferDictState() {
  /** 最後に送信済みの sentences 配列インデックス (exclusive) */
  let lastSentEndIndex = 0;

  /**
   * まだ送信していない文ごとにペイロードを生成する。
   * vectorSend と異なり 1 文ずつ送るため配列で返す。
   */
  function buildPayloads(sentences: string[]): ReferDictPayload[] {
    if (sentences.length === 0) return [];

    const startIndex = lastSentEndIndex;
    const endIndex = sentences.length;
    if (startIndex >= endIndex) return [];

    const payloads: ReferDictPayload[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const text = sentences[i].trim();
      if (text.length > 0) {
        payloads.push({ text, sentenceIndex: i });
      }
    }

    lastSentEndIndex = endIndex;
    return payloads;
  }

  /** 後方互換: 単一文のペイロード生成 */
  function buildPayload(sentence: string): ReferDictPayload | null {
    if (sentence.length === 0) return null;
    return { text: sentence, sentenceIndex: lastSentEndIndex };
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

  return { buildPayloads, buildPayload, reset, getLastSentEndIndex, setLastSentEndIndex };
}

// ── API 通信 ──────────────────────────────────────────────────
const REFER_DICT_API_PATH = '/analysis/refer_dictionary';

export function getReferDictApiUrl(baseUrl: string): string {
  const base = baseUrl?.trim() ?? '';
  if (!base) return REFER_DICT_API_PATH;
  try {
    return `${new URL(base).origin}${REFER_DICT_API_PATH}`;
  } catch {
    return `${base.replace(/\/$/, '')}${REFER_DICT_API_PATH}`;
  }
}

/**
 * 1 文を refer_dictionary API に POST し、型付きレスポンスを返す。
 */
export async function sendReferDictRequest(
  payload: ReferDictPayload,
  baseUrl: string,
): Promise<ReferDictResponse> {
  const url = getReferDictApiUrl(baseUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: payload.text }),
  });
  if (!res.ok) {
    throw new Error(`Refer Dict API error: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<ReferDictResponse>;
}

// ── ヘルパー ──────────────────────────────────────────────────
/**
 * description の先頭 1 文を取り出す（ホバー時の短い説明用）。
 */
export function firstSentence(desc: string): string {
  if (!desc) return '';
  const m = desc.match(/^[^。．.!?！？\n]+[。．.!?！？]?/);
  return m ? m[0].trim() : desc.slice(0, 60);
}
