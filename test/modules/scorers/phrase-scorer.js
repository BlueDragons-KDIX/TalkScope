import { STOP_WORDS } from "../config.js";
import {
  createZeroScoreMap,
  hasJapanese,
  normalizeToken,
  segmentJapaneseRaw,
  tokenize,
} from "../text-utils.js";
import { normalizeMap } from "./scorer-utils.js";

const JA_BOUNDARY = new Set([
  "は",
  "が",
  "を",
  "に",
  "へ",
  "で",
  "と",
  "や",
  "の",
  "から",
  "まで",
  "より",
  "も",
  "ね",
  "よ",
  "か",
  "し",
  "です",
  "ます",
  "た",
  "だ",
]);

function isJapaneseContentToken(token) {
  if (!token) return false;
  if (STOP_WORDS.has(token)) return false;
  if (/^[\p{P}\p{S}]+$/u.test(token)) return false;
  if (/^[ぁ-ん]+$/u.test(token)) return false;
  if (/^[一-龠々]$/u.test(token)) return false;
  return true;
}

function extractJapanesePhrases(text) {
  const raw = segmentJapaneseRaw(text);
  const phrases = [];
  let current = [];

  for (const tokenRaw of raw) {
    const token = normalizeToken(tokenRaw);
    if (!token) continue;

    const isBoundary =
      JA_BOUNDARY.has(token) ||
      /^[。、「」！？!?.,]$/u.test(tokenRaw) ||
      /^(です|ます|した|して|する)$/u.test(token);

    if (isBoundary) {
      if (current.length >= 2) phrases.push([...current]);
      current = [];
      continue;
    }

    if (isJapaneseContentToken(token)) {
      current.push(token);
      if (current.length > 5) current.shift();
    } else if (current.length >= 2) {
      phrases.push([...current]);
      current = [];
    }
  }
  if (current.length >= 2) phrases.push([...current]);
  return phrases;
}

function scorePhrasesForTokens(phrases, scoreMap) {
  const phraseCount = new Map();
  const pairCount = new Map();

  for (const phrase of phrases) {
    const key = phrase.join(" ");
    phraseCount.set(key, (phraseCount.get(key) || 0) + 1);

    for (let i = 0; i < phrase.length - 1; i += 1) {
      const pairKey = `${phrase[i]}::${phrase[i + 1]}`;
      pairCount.set(pairKey, (pairCount.get(pairKey) || 0) + 1);
    }
  }

  for (const phrase of phrases) {
    const key = phrase.join(" ");
    const freq = phraseCount.get(key) || 1;
    const len = phrase.length;
    const phraseWeight = Math.log1p(freq) * (0.58 + 0.18 * Math.min(4, len - 1));

    for (let i = 0; i < phrase.length; i += 1) {
      const token = phrase[i];
      if (!scoreMap.has(token)) continue;

      let pairSupport = 0;
      if (i > 0) pairSupport += pairCount.get(`${phrase[i - 1]}::${token}`) || 0;
      if (i < phrase.length - 1)
        pairSupport += pairCount.get(`${token}::${phrase[i + 1]}`) || 0;

      const add = phraseWeight * (0.6 + pairSupport * 0.14);
      scoreMap.set(token, scoreMap.get(token) + add);
    }
  }
}

function scoreJapanesePhrases(scoreMap, text) {
  const phrases = extractJapanesePhrases(text);
  scorePhrasesForTokens(phrases, scoreMap);
}

function scoreEnglishPhrases(scoreMap, text) {
  if (!window.nlp) return;
  const phrases = window
    .nlp(text)
    .match("#Adjective* #Noun+")
    .out("array")
    .map((phrase) => tokenize(phrase))
    .filter((tokens) => tokens.length >= 2 && tokens.length <= 5);

  scorePhrasesForTokens(phrases, scoreMap);
}

export function buildPhraseScore(text, tokens) {
  const score = createZeroScoreMap(tokens);

  if (hasJapanese(text)) {
    scoreJapanesePhrases(score, text);
  } else {
    scoreEnglishPhrases(score, text);
  }

  normalizeMap(score);
  for (const [token, value] of score.entries()) {
    score.set(token, Math.pow(value, 0.82));
  }
  return score;
}
