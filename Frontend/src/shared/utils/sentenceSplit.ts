// 句点・改行で一文に分割（ベクトルAPI送信用チャンク）
const SENTENCE_END = /([。．.!?！？\n]+)/;

/**
 * テキストを一文ごとに分割して返す。区切り文字はその文の末尾に含める。
 */
export function splitIntoSentences(text: string): string[] {
  if (!text?.trim()) return [];
  const parts = text.split(SENTENCE_END);
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i] ?? '';
    const delimiter = parts[i + 1] ?? '';
    const sentence = (body + delimiter).trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}
