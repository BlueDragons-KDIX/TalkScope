import { Term, IT_TERMS } from "../data/terms";

/**
 * 文字起こしテキストからIT用語を抽出する。
 * extraTerms が渡された場合、API で発見された動的用語も対象に含める。
 */
export const extractTerms = (text: string, extraTerms: Term[] = []): Term[] => {
  const allTerms = [...IT_TERMS, ...extraTerms];
  // word の重複を除去（IT_TERMS 優先）
  const seen = new Set<string>();
  const unique: Term[] = [];
  for (const t of allTerms) {
    const key = t.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  return unique.filter(term =>
    text.toLowerCase().includes(term.word.toLowerCase()) ||
    (term.kana && text.includes(term.kana))
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
    const reKana = kana ? new RegExp(kana, 'g') : null;
    const wordMatches = text.match(reWord);
    const kanaMatches = reKana ? text.match(reKana) : null;
    count = (wordMatches?.length ?? 0) + (kanaMatches?.length ?? 0);
    out[term.id] = count;
  }
  return out;
}

/**
 * テキスト内の用語をマークアップする。
 * extraTerms が渡された場合、API で発見された動的用語もハイライト対象にする。
 */
export const highlightTerms = (text: string, extraTerms: Term[] = []) => {
  if (!text) return [];

  // IT_TERMS + 動的用語を合成し、word の重複は IT_TERMS 優先で排除
  const allTerms = [...IT_TERMS];
  const knownWords = new Set(IT_TERMS.map(t => t.word.toLowerCase()));
  for (const t of extraTerms) {
    if (!knownWords.has(t.word.toLowerCase())) {
      allTerms.push(t);
      knownWords.add(t.word.toLowerCase());
    }
  }

  // ソートして長い単語から先にマッチさせる（部分一致対策）
  const sortedTerms = allTerms.sort((a, b) => b.word.length - a.word.length);
  
  // 単語を正規表現で探すためのパターン (特殊文字をエスケープ)
  const patterns = sortedTerms.map(t => {
    const escapedWord = t.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (t.kana) {
      const escapedKana = t.kana.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `(${escapedWord}|${escapedKana})`;
    }
    return `(${escapedWord})`;
  }).join('|');
  
  if (!patterns) return [{ type: 'text' as const, content: text }];

  const regex = new RegExp(patterns, 'gi');
  const parts: Array<{ type: 'text' | 'term'; content: string; term?: Term }> = [];
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
      (t.kana && matchedText === t.kana)
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
