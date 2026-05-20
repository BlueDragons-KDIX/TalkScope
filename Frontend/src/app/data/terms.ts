export interface Term {
  id: string;
  word: string;
  kana: string;
  shortDesc: string;
  longDesc: string;
  /** @deprecated 互換のため残す（表示・正規化は domain の normalizeTermCategory に従う） */
  category: string;
  /** @deprecated 互換のため残す */
  score: number;
  relatedTerms: string[];
  externalUrl?: string;
}
