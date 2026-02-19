import { DOMAIN_HINTS } from "../config.js";
import {
  createZeroScoreMap,
  hasJapanese,
  normalizeToken,
  parseKeywordSeeds,
  splitSentences,
} from "../text-utils.js";
import { cosineSimilarity } from "./scorer-utils.js";

let useModel = null;
let useModelPromise = null;

function normalizeKey(value) {
  return normalizeToken(value).replace(/\s+/g, "");
}

function buildDomainCatalog() {
  const domainEntries = [];
  for (const [domain, hints] of Object.entries(DOMAIN_HINTS)) {
    for (const hint of hints) {
      const term = normalizeKey(hint);
      if (!term) continue;
      domainEntries.push({ domain, term });
    }
  }
  return domainEntries;
}

function buildHintSpecificity(domainEntries) {
  const df = new Map();
  const allDomains = new Set(domainEntries.map((entry) => entry.domain));

  for (const { domain, term } of domainEntries) {
    if (!df.has(term)) df.set(term, new Set());
    df.get(term).add(domain);
  }

  const maxDomain = Math.max(allDomains.size, 1);
  const termWeight = new Map();
  for (const [term, domainSet] of df.entries()) {
    const idf = Math.log((maxDomain + 1) / (domainSet.size + 1)) + 1;
    termWeight.set(term, Math.min(1.4, idf));
  }
  return termWeight;
}

function expandDomainTerms(seeds) {
  const domainEntries = buildDomainCatalog();
  const termSpecificity = buildHintSpecificity(domainEntries);
  const terms = new Set(seeds.map(normalizeKey));
  const keys = Object.keys(DOMAIN_HINTS);

  for (const seed of seeds) {
    const normalizedSeed = normalizeKey(seed);
    if (!normalizedSeed) continue;

    for (const key of keys) {
      if (normalizedSeed.includes(key) || key.includes(normalizedSeed)) {
        for (const hint of DOMAIN_HINTS[key]) {
          terms.add(normalizeKey(hint));
        }
      }
    }
  }

  const weightedTerms = [...terms]
    .filter(Boolean)
    .map((term) => ({
      term,
      weight: termSpecificity.get(term) || 1,
    }));

  return weightedTerms;
}

function buildBigrams(value) {
  if (!value || value.length < 2) return new Set([value]);
  const grams = new Set();
  for (let i = 0; i < value.length - 1; i += 1) {
    grams.add(value.slice(i, i + 2));
  }
  return grams;
}

function bigramJaccard(a, b) {
  const setA = buildBigrams(a);
  const setB = buildBigrams(b);
  let inter = 0;
  for (const g of setA) {
    if (setB.has(g)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  if (!union) return 0;
  return inter / union;
}

function lexicalSimilarity(token, term) {
  if (!token || !term) return 0;
  if (token === term) return 0.88;
  if (token.includes(term) || term.includes(token)) return 0.75;
  return bigramJaccard(token, term) * 0.7;
}

function sentenceCooccurrenceBoost(token, domainTerms, text) {
  if (!text) return 0;
  const sentences = splitSentences(text);
  let hit = 0;
  for (const sentence of sentences) {
    const s = normalizeKey(sentence);
    if (!s.includes(token)) continue;
    if (domainTerms.some((entry) => s.includes(entry.term))) {
      hit += 1;
    }
  }
  if (hit === 0) return 0;
  return Math.min(0.18, hit * 0.06);
}

function aggregateLexicalSimilarity(token, weightedTerms) {
  const sims = weightedTerms.map(({ term, weight }) => ({
    sim: lexicalSimilarity(token, term),
    weight,
  }));
  sims.sort((a, b) => b.sim - a.sim);
  const top = sims.slice(0, 3);
  let num = 0;
  let den = 0;
  for (const { sim, weight } of top) {
    num += sim * weight;
    den += weight;
  }
  if (!den) return 0;
  return num / den;
}

async function ensureUseModel(onStatus) {
  if (useModel) return useModel;
  if (!useModelPromise) {
    onStatus("意味類似モデルを読み込み中...");
    useModelPromise = window.use
      .load()
      .then((model) => {
        useModel = model;
        onStatus("意味類似モデルの準備完了");
        return model;
      })
      .catch((err) => {
        useModelPromise = null;
        throw err;
      });
  }
  await useModelPromise;
  return useModel;
}

async function buildUseSimilarity(tokens, domainQuery, onStatus) {
  const score = new Map();
  if (!tokens.length || !domainQuery) return score;

  const model = await ensureUseModel(onStatus);
  const uniqTokens = [...new Set(tokens)];
  const texts = [...uniqTokens, domainQuery];
  const embeddings = await model.embed(texts);
  const embeddingArray = await embeddings.array();
  embeddings.dispose();

  const queryVector = embeddingArray[embeddingArray.length - 1];
  for (let i = 0; i < uniqTokens.length; i += 1) {
    const sim = cosineSimilarity(embeddingArray[i], queryVector);
    score.set(uniqTokens[i], Math.max(0, (sim + 1) / 2));
  }
  return score;
}

function squash(value) {
  return 1 / (1 + Math.exp(-5.2 * (value - 0.55)));
}

export async function buildSemanticScore(tokens, keywordQuery, options = {}) {
  const { onStatus = () => {}, text = "" } = options;
  const score = createZeroScoreMap(tokens);
  if (!tokens.length) return score;

  const seeds = parseKeywordSeeds(keywordQuery);
  const safeSeeds = seeds.length ? seeds : ["it"];
  const domainTerms = expandDomainTerms(safeSeeds);
  const normalizedTokenList = [...new Set(tokens.map(normalizeKey))];

  let useScore = new Map();
  const domainQueryText = safeSeeds.join(" ");
  const shouldTryUse =
    !hasJapanese(domainQueryText) ||
    normalizedTokenList.some((token) => /^[a-z0-9_'-]+$/i.test(token));

  if (shouldTryUse) {
    try {
      useScore = await buildUseSimilarity(
        normalizedTokenList,
        domainQueryText,
        onStatus
      );
    } catch (_err) {
      onStatus("意味類似モデル読み込み失敗。語彙類似のみで継続します");
      useScore = new Map();
    }
  }

  for (const token of normalizedTokenList) {
    const lexical = aggregateLexicalSimilarity(token, domainTerms);
    const coocc = sentenceCooccurrenceBoost(token, domainTerms, text);
    const emb = useScore.get(token) || 0;
    const raw = useScore.has(token)
      ? lexical * 0.56 + coocc * 0.12 + emb * 0.32
      : lexical * 0.82 + coocc * 0.18;
    score.set(token, squash(Math.min(1, raw)));
  }

  return score;
}
