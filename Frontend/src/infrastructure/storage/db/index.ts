export {
  getDB,
  putPresentation,
  getPresentation,
  getAllPresentations,
  putHistory,
  getHistoryByPresentationAndWord,
  getPinnedWordIdsByPresentation,
  setHistoryPinned,
  putWord,
  getWord,
  getAllWords,
  addPinnedTerm,
  removePinnedTerm,
  getAllPinnedTerms,
} from './client';
export type { LexiFlowDB } from './client';
export type { PresentationRow, HistoryRow, WordRow, PinnedTermRow } from './schema';
export { DB_NAME, DB_VERSION, STORE_NAMES } from './schema';
