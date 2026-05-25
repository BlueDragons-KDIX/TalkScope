export function combineScores(tokens, parts, weights) {
  const scoreMap = new Map();

  for (const token of new Set(tokens)) {
    const tf = parts.tf.get(token) || 0;
    const structure = parts.structure.get(token) || 0;
    const semantic = parts.semantic.get(token) || 0;
    const phrase = parts.phrase.get(token) || 0;

    const total =
      (tf * weights.tf +
        structure * weights.structure +
        semantic * weights.semantic +
        phrase * weights.phrase) *
      (0.35 + semantic * 0.65);

    scoreMap.set(token, {
      token,
      total,
      tf,
      structure,
      semantic,
      phrase,
    });
  }

  return [...scoreMap.values()].sort((a, b) => b.total - a.total);
}
