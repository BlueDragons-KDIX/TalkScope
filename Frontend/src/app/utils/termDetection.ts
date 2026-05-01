import { Term } from "../data/terms";

/**
 * 文字起こしテキスト内での各用語の出現回数を数える（バブルサイズの頻度用）
 */
export function countTermFrequencies(text: string, terms: Term[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (!text.trim()) return out;
  for (const term of terms) {
    let count = 0;
    const word = term.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const kana = term.kana.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reWord = new RegExp(word, 'gi');
    const reKana = kana ? new RegExp(kana, 'g') : null;
    const wordMatches = text.match(reWord);
    const kanaMatches = reKana ? text.match(reKana) : null;
    count = (wordMatches?.length ?? 0) + (kanaMatches?.length ?? 0);
    out[term.id] = count;
  }
  return out;
}

/**
 * テキスト内の用語（サーバーから受け取った terms）をマークアップする。
 * フロントエンド側の静的辞書には依存しない。
 */
export const highlightTerms = (text: string, terms: Term[] = []) => {
  if (!text) return [];
  if (terms.length === 0) return [{ type: 'text' as const, content: text }];

  // 長い単語から先にマッチさせる（部分一致対策）
  const sortedTerms = [...terms].sort((a, b) => b.word.length - a.word.length);

  const patterns = sortedTerms.map(t => {
    const escapedWord = t.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (t.kana) {
      const escapedKana = t.kana.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `(${escapedWord}|${escapedKana})`;
    }
    return `(${escapedWord})`;
  }).join('|');

  const regex = new RegExp(patterns, 'gi');
  const parts: Array<{ type: 'text' | 'term'; content: string; term?: Term }> = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }

    const matchedText = match[0];
    const term = sortedTerms.find(t =>
      matchedText.toLowerCase() === t.word.toLowerCase() ||
      (t.kana && matchedText === t.kana)
    );

    parts.push(term
      ? { type: 'term', content: matchedText, term }
      : { type: 'text', content: matchedText }
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
};
