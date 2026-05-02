export function normalizeMap(map) {
  const values = [...map.values()];
  const max = Math.max(...values, 0);
  if (max === 0) return map;
  for (const [k, v] of map.entries()) {
    map.set(k, v / max);
  }
  return map;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
