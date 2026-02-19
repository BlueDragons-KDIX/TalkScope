import {
  createZeroScoreMap,
  hasJapanese,
  normalizeToken,
  segmentJapaneseRaw,
  splitSentences,
  tokenize,
} from "../text-utils.js";
import { normalizeMap } from "./scorer-utils.js";

function findTokenIndex(tokenArray, candidates) {
  if (!candidates.length) return -1;
  for (let i = 0; i < tokenArray.length; i += 1) {
    if (candidates.includes(tokenArray[i])) return i;
  }
  return -1;
}

function scoreJapaneseSentence(scoreMap, sentence) {
  const rawTokens = segmentJapaneseRaw(sentence);
  for (let i = 0; i < rawTokens.length; i += 1) {
    const token = normalizeToken(rawTokens[i]);
    if (!scoreMap.has(token)) continue;
    const next = rawTokens[i + 1];
    let add = 0;
    if (i === 0) add += 0.12;
    if (next === "は" || next === "が") add += 0.34;
    if (next === "を" || next === "に" || next === "へ") add += 0.28;
    if (next === "で" || next === "から") add += 0.16;
    scoreMap.set(token, scoreMap.get(token) + add);
  }
}

function scoreEnglishSentence(scoreMap, sentence, sentenceTokens) {
  const sDoc = window.nlp ? window.nlp(sentence) : null;
  const verbs = sDoc ? sDoc.verbs().out("array").map(normalizeToken) : [];
  const nouns = sDoc ? sDoc.nouns().out("array").map(normalizeToken) : [];
  const phraseCandidates = sDoc
    ? sDoc.match("#Adjective* #Noun+").out("array").map(normalizeToken)
    : [];

  const firstVerbIndex = findTokenIndex(sentenceTokens, verbs);
  const sentenceLead = sentenceTokens.slice(0, 2);

  for (const token of sentenceTokens) {
    if (!scoreMap.has(token)) continue;

    let add = 0;
    if (sentenceLead.includes(token)) add += 0.14;
    if (nouns.includes(token) && firstVerbIndex > 0) {
      const idx = sentenceTokens.indexOf(token);
      if (idx >= 0 && idx < firstVerbIndex) add += 0.3;
      if (idx > firstVerbIndex) add += 0.26;
    }
    if (phraseCandidates.some((phrase) => phrase.includes(token))) add += 0.2;
    scoreMap.set(token, scoreMap.get(token) + add);
  }
}

export function buildStructureScore(text, tokens) {
  const score = createZeroScoreMap(tokens);
  const sentences = splitSentences(text);

  for (const sentence of sentences) {
    const sentenceTokens = tokenize(sentence);
    if (!sentenceTokens.length) continue;
    if (hasJapanese(sentence)) {
      scoreJapaneseSentence(score, sentence);
    } else {
      scoreEnglishSentence(score, sentence, sentenceTokens);
    }
  }

  normalizeMap(score);
  return score;
}
