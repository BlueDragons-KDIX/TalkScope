import { splitSentences, tokenize } from "../text-utils.js";

function normalizeMap(map) {
  const max = Math.max(...map.values(), 1);
  const out = new Map();
  for (const [token, value] of map.entries()) {
    out.set(token, value / max);
  }
  return out;
}

function buildTfMap(tokens) {
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return normalizeMap(counts);
}

function buildSentenceIdfMap(text, tokenSet) {
  const sentences = splitSentences(text);
  const sentenceCount = Math.max(sentences.length, 1);
  const dfMap = new Map([...tokenSet].map((token) => [token, 0]));

  for (const sentence of sentences) {
    const sentenceTokens = new Set(tokenize(sentence));
    for (const token of sentenceTokens) {
      if (dfMap.has(token)) {
        dfMap.set(token, dfMap.get(token) + 1);
      }
    }
  }

  const idfMap = new Map();
  for (const [token, df] of dfMap.entries()) {
    const idf = Math.log((sentenceCount + 1) / (df + 1)) + 1;
    idfMap.set(token, idf);
  }
  return idfMap;
}

function buildTfidfMap(text, tokens) {
  const tfMap = buildTfMap(tokens);
  const idfMap = buildSentenceIdfMap(text, new Set(tokens));
  const tfidfMap = new Map();

  for (const token of new Set(tokens)) {
    const tf = tfMap.get(token) || 0;
    const idf = idfMap.get(token) || 1;
    tfidfMap.set(token, tf * idf);
  }
  return normalizeMap(tfidfMap);
}

export function buildTermWeightScore(text, tokens, useTfIdf) {
  if (useTfIdf) {
    return {
      scoreMap: buildTfidfMap(text, tokens),
      modeLabel: "TF-IDF",
    };
  }

  return {
    scoreMap: buildTfMap(tokens),
    modeLabel: "TF",
  };
}
