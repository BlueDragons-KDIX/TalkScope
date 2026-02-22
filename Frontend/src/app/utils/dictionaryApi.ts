export interface DictionaryEntry {
  id: number;
  term: string;
  description: string;
  meaning_vector: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface DictionaryEntryListResponse {
  items: DictionaryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface DictionaryBulkRegisterResponse {
  requested_count: number;
  created_count: number;
  skipped_count: number;
  results: Array<{
    term: string;
    status: 'created' | 'skipped';
    entry?: DictionaryEntry;
    skipped?: {
      term: string;
      reason: string;
    };
  }>;
}

export interface DictionaryEntryUpdatePayload {
  term?: string;
  description?: string;
}

const DICTIONARY_API_PREFIX = '/dictionary';

function getBackendBaseUrl(): string {
  const back = import.meta.env.VITE_BACKEND_URL;
  const vec = import.meta.env.VITE_VECTOR_API_URL;
  const url = (typeof back === 'string' ? back.trim() : '') || (typeof vec === 'string' ? vec.trim() : '');
  return url ? url.replace(/\/$/, '') : '';
}

function buildDictionaryApiUrl(path: string): string {
  const base = getBackendBaseUrl();
  if (!base) return `${DICTIONARY_API_PREFIX}${path}`;
  try {
    return `${new URL(base).origin}${DICTIONARY_API_PREFIX}${path}`;
  } catch {
    return `${base}${DICTIONARY_API_PREFIX}${path}`;
  }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `${res.status}`;
  try {
    const parsed = JSON.parse(text) as { detail?: string };
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return `${res.status} ${parsed.detail}`;
    }
  } catch {
    // noop
  }
  return `${res.status} ${text}`;
}

export async function fetchDictionaryEntries(params: {
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<DictionaryEntryListResponse> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (typeof params.limit === 'number') searchParams.set('limit', String(params.limit));
  if (typeof params.offset === 'number') searchParams.set('offset', String(params.offset));

  const suffix = searchParams.toString();
  const url = buildDictionaryApiUrl(`/entries${suffix ? `?${suffix}` : ''}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<DictionaryEntryListResponse>;
}

export async function updateDictionaryEntry(
  entryId: number,
  payload: DictionaryEntryUpdatePayload,
): Promise<DictionaryEntry> {
  const url = buildDictionaryApiUrl(`/entries/${entryId}`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<DictionaryEntry>;
}

export async function deleteDictionaryEntry(entryId: number): Promise<void> {
  const url = buildDictionaryApiUrl(`/entries/${entryId}`);
  const res = await fetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function bulkRegisterDictionaryTerms(rawTerms: string): Promise<DictionaryBulkRegisterResponse> {
  const url = buildDictionaryApiUrl('/entries/bulk');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_terms: rawTerms }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return res.json() as Promise<DictionaryBulkRegisterResponse>;
}
