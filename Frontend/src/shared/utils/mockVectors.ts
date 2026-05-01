/**
 * 60〜300次元のベクトルモックと類似度計算。
 * APIが無い場合や検証用に、固定・再現可能なベクトルを生成する。
 */

export const MOCK_DIM = 300;

/**
 * 文字列から擬似乱数のシードを返す（同じ文字列なら同じシード）
 */
function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * シード付き擬似乱数（0〜1）
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * 単位ベクトルに正規化する
 */
function normalize(v: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

/**
 * 用語IDから決定的なモックベクトルを生成（60〜dim次元、デフォルト300）。
 * テスト用に主題・会話ベクトルをブレンドし、用語ごとに類似度に差が出るようにする。
 */
export function getMockTermVector(termId: string, dim: number = MOCK_DIM): number[] {
  const seed = seedFromString(termId);
  const d = Math.max(60, Math.min(300, dim));
  const theme = getMockThemeVector(d);
  const conv = getMockConversationVector(d);
  // 用語ごとに主題・会話への寄り度を大きくばらつかせる（低い用語は0.08、高い用語は0.8付近）
  let themeWeight = 0.08 + (seed % 73) / 100;
  let convWeight = 0.08 + ((seed * 7919) % 73) / 100;
  let rest = 1 - themeWeight - convWeight;
  if (rest < 0.05) {
    const scale = 0.95 / (themeWeight + convWeight);
    themeWeight *= scale;
    convWeight *= scale;
    rest = 0.05;
  }
  const v: number[] = [];
  for (let i = 0; i < d; i++) {
    const rnd = seededRandom(seed + i * 7919) * 2 - 1;
    v.push(themeWeight * theme[i] + convWeight * conv[i] + rest * rnd);
  }
  return normalize(v);
}

/** 主題用の固定モックベクトル（API未設定時用） */
let _mockThemeVector: number[] | null = null;
export function getMockThemeVector(dim: number = MOCK_DIM): number[] {
  if (!_mockThemeVector || _mockThemeVector.length !== dim) {
    const seed = seedFromString('mock-theme');
    const d = Math.max(60, Math.min(300, dim));
    const v: number[] = [];
    for (let i = 0; i < d; i++) v.push(seededRandom(seed + i) * 2 - 1);
    _mockThemeVector = normalize(v);
  }
  return _mockThemeVector;
}

/** 直近会話用の固定モックベクトル */
let _mockConversationVector: number[] | null = null;
export function getMockConversationVector(dim: number = MOCK_DIM): number[] {
  if (!_mockConversationVector || _mockConversationVector.length !== dim) {
    const seed = seedFromString('mock-conversation');
    const d = Math.max(60, Math.min(300, dim));
    const v: number[] = [];
    for (let i = 0; i < d; i++) v.push(seededRandom(seed + i * 31) * 2 - 1);
    _mockConversationVector = normalize(v);
  }
  return _mockConversationVector;
}

/**
 * コサイン類似度（-1〜1）。次元が異なる場合は短い方に合わせる。
 * 単位ベクトル同士の場合は内積と一致する。
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  const sim = dot / denom;
  return Math.max(-1, Math.min(1, sim));
}

/**
 * 類似度を 0〜1 のスコアに変換（-1〜1 → 0〜1）。
 * 類似度が低いときはスコアをより低くするため、2乗で非線形変換する。
 */
export function similarityToScore(sim: number): number {
  const raw = (sim + 1) / 2; // 0〜1
  return raw * raw; // 低い類似度 → より低いスコア（例: 0.5→0.25, 0.3→0.09）
}
