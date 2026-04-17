/**
 * IndexedDB スキーマ型定義（画像の3ストア構成 + 辞書で使う履歴・単語情報）
 * 参考: https://zenn.dev/peter_norio/articles/e0620bfd7feb8f
 */

/** すべての発表（presentations）: 発表id, 会話の全文, 会話のベクトル, 主題のベクトル, 発表名=主題 */
export interface PresentationRow {
  presentationId: string;
  /** 会話の全文 */
  fullText: string;
  /** 会話のベクトル (number[]) */
  conversationVector: number[];
  /** 主題のベクトル (number[]) */
  themeVector: number[];
  /** 発表名＝主題（主題テキスト） */
  themeText: string;
}

/** 履歴（history）: 発表⇔単語の紐付け・ピン留め。辞書で使う */
export interface HistoryRow {
  /** 主キー（autoIncrement） */
  historyId?: number;
  /** 発表id（FK → presentations） */
  presentationId: string;
  /** 単語id（FK → words） */
  wordId: string;
  /** ピン留めしたか */
  isPinned: boolean;
}

/** すべての単語情報（words）: 単語, 解説, ベクトル, 完全に理解した, 関連ワード。辞書で使う */
export interface WordRow {
  wordId: string;
  /** 単語 */
  word: string;
  /** 解説 */
  explanation: string;
  /** ベクトル (number[]) */
  vector: number[];
  /** 完全に理解した */
  isUnderstood: boolean;
  /** 関連ワード */
  relatedWords: string[];
}

/** ピン留めした用語（ピン中一覧用）。Term と同型で保存 */
export interface PinnedTermRow {
  id: string;
  word: string;
  kana: string;
  shortDesc: string;
  longDesc: string;
  category: 'Frontend' | 'Backend' | 'Infra' | 'AI/Data' | 'General';
  level: number;
  relatedTerms: string[];
  externalUrl?: string;
}

/** DB バージョン（構造変更時に増やす） */
export const DB_VERSION = 2;

/** データベース名 */
export const DB_NAME = 'lexiflow-db';

/** オブジェクトストア名 */
export const STORE_NAMES = {
  presentations: 'presentations',
  history: 'history',
  words: 'words',
  pinnedTerms: 'pinnedTerms',
} as const;
