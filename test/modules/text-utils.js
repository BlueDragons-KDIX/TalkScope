import { STOP_WORDS } from "./config.js";

const jpSegmenter = window.TinySegmenter ? new window.TinySegmenter() : null;
const JA_FALLBACK_PATTERN = /[一-龠々]+|[ぁ-ん]+|[ァ-ヶー]+|[A-Za-z][A-Za-z0-9_'-]*/g;

export function normalizeToken(token) {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function hasJapanese(text) {
  return /[ぁ-んァ-ヶ一-龠]/u.test(text);
}

function isOnlyHiragana(token) {
  return /^[ぁ-ん]+$/u.test(token);
}

function isSingleKanji(token) {
  return /^[一-龠々]$/u.test(token);
}

function trimJapaneseSuffix(token) {
  return token
    .replace(/(でした|です|ます|ません|ない|たい|られる|れる|する|した|して)$/u, "")
    .replace(/[はがをにでへのとやもよりからまで]+$/u, "");
}

function isUsefulJapaneseToken(token) {
  if (!token) return false;
  if (STOP_WORDS.has(token)) return false;
  if (token.length <= 1 && !/^[a-z0-9]+$/i.test(token)) return false;
  if (isOnlyHiragana(token)) return false;
  if (isSingleKanji(token)) return false;
  if (/^[\p{P}\p{S}]+$/u.test(token)) return false;
  return true;
}

function fallbackJapaneseTokens(text) {
  return fallbackJapaneseRaw(text)
    .map((token) => token.trim())
    .map(trimJapaneseSuffix)
    .map(normalizeToken)
    .filter(isUsefulJapaneseToken);
}

function fallbackJapaneseRaw(text) {
  return text.match(JA_FALLBACK_PATTERN) || [];
}

export function segmentJapaneseRaw(text) {
  if (!jpSegmenter) return fallbackJapaneseRaw(text);
  return jpSegmenter.segment(text);
}

export function tokenizeJapanese(text) {
  if (!jpSegmenter) return fallbackJapaneseTokens(text);
  return segmentJapaneseRaw(text)
    .map((token) => token.trim())
    .map(trimJapaneseSuffix)
    .map(normalizeToken)
    .filter(isUsefulJapaneseToken);
}

export function tokenize(text) {
  if (hasJapanese(text)) return tokenizeJapanese(text);
  return (text.match(/[\p{L}\p{N}_'-]+/gu) || [])
    .map(normalizeToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function splitSentences(text) {
  return text
    .split(/[。！？!?\.]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createZeroScoreMap(tokens) {
  return new Map(tokens.map((token) => [token, 0]));
}

export function parseKeywordSeeds(keywordQuery) {
  return [...new Set(
    keywordQuery
      .split(/[,、\s]+/g)
      .map((seed) => normalizeToken(seed.trim()))
      .filter(Boolean)
  )];
}
