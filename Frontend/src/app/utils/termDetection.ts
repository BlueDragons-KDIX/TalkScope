import { Term, IT_TERMS } from "../data/terms";

/**
 * 文字起こしテキストからIT用語を抽出する
 */
export const extractTerms = (text: string): Term[] => {
  return IT_TERMS.filter(term => 
    text.toLowerCase().includes(term.word.toLowerCase()) || 
    text.includes(term.kana)
  );
};

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
    const reKana = new RegExp(kana, 'g');
    const wordMatches = text.match(reWord);
    const kanaMatches = text.match(reKana);
    count = (wordMatches?.length ?? 0) + (kanaMatches?.length ?? 0);
    out[term.id] = count;
  }
  return out;
}

/**
 * テキスト内の用語をマークアップする
 */
export const highlightTerms = (text: string) => {
  if (!text) return [];
  
  // ソートして長い単語から先にマッチさせる（部分一致対策）
  const sortedTerms = [...IT_TERMS].sort((a, b) => b.word.length - a.word.length);
  
  // 単語を正規表現で探すためのパターン (特殊文字をエスケープ)
  const patterns = sortedTerms.map(t => {
    const escapedWord = t.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedKana = t.kana.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `(${escapedWord}|${escapedKana})`;
  }).join('|');
  
  if (!patterns) return [{ type: 'text', content: text }];

  const regex = new RegExp(patterns, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // マッチした用語を特定
    const matchedText = match[0];
    const term = sortedTerms.find(t => 
      matchedText.toLowerCase() === t.word.toLowerCase() || 
      matchedText === t.kana
    );

    if (term) {
      parts.push({
        type: 'term',
        content: matchedText,
        term: term
      });
    } else {
      parts.push({
        type: 'text',
        content: matchedText
      });
    }

    lastIndex = regex.lastIndex;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return parts;
};
