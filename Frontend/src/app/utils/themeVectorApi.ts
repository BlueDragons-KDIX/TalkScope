/**
 * 主題テキストをバックエンドの POST /analysis/vectorize でベクトル化し、
 * トークンベクトルの平均を「主題ベクトル」として返す。
 * 類似度計算の基準ベクトルとして利用する。
 */

import { getVectorApiUrl } from './vectorSendWithOverlap';

export interface ThemeVectorResult {
  vector: number[];
  dim: number;
}

function getBaseUrl(): string {
  const back = import.meta.env.VITE_BACKEND_URL;
  const vec = import.meta.env.VITE_VECTOR_API_URL;
  const url = (typeof back === 'string' ? back.trim() : '') || (typeof vec === 'string' ? vec.trim() : '');
  return url ? url.replace(/\/$/, '') : '';
}

/**
 * テキストをAPIでベクトル化し、トークンベクトルの平均を返す。
 * 空文字・トークン0件の場合は null。
 */
export async function fetchThemeVector(text: string): Promise<ThemeVectorResult | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const url = getVectorApiUrl(getBaseUrl());
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: trimmed }),
  });
  if (!res.ok) {
    throw new Error(`主題ベクトルAPIエラー: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    tokens?: Array<{ vector?: number[]; vector_dim?: number }>;
    meta?: { vector_dim?: number };
  };
  const tokens = data?.tokens ?? [];
  if (tokens.length === 0) return null;

  const dim = data?.meta?.vector_dim ?? tokens[0]?.vector_dim ?? 0;
  if (dim === 0) return null;

  const sum = new Array<number>(dim).fill(0);
  let count = 0;
  for (const t of tokens) {
    const v = t?.vector;
    if (!Array.isArray(v) || v.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += v[i];
    count += 1;
  }
  if (count === 0) return null;

  const vector = sum.map((s) => s / count);
  return { vector, dim };
}
