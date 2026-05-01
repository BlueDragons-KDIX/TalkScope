/**
 * IndexedDB クライアント（idb 使用）
 * 参考: https://zenn.dev/peter_norio/articles/e0620bfd7feb8f
 * - openDB で DB を開き、upgrade でオブジェクトストア・インデックスを定義
 * - トランザクション（readwrite / readonly）→ objectStore → add/put/delete/get/getAll
 */

import { openDB, type IDBPDatabase } from 'idb';
import {
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
  type PresentationRow,
  type HistoryRow,
  type WordRow,
  type PinnedTermRow,
} from './schema';

export type LexiFlowDB = IDBPDatabase;

let dbPromise: Promise<LexiFlowDB> | null = null;

/**
 * データベースを開く。初回またはバージョンアップ時に upgrade が実行される。
 * 参考: openDB 第三引数の upgrade で createObjectStore / createIndex
 * https://zenn.dev/peter_norio/articles/e0620bfd7feb8f#opendb%E3%83%A1%E3%82%BD%E3%83%83%E3%83%89
 */
export function getDB(): Promise<LexiFlowDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion) {
        // すべての発表: 主キー presentationId（インラインキー）
        if (!db.objectStoreNames.contains(STORE_NAMES.presentations)) {
          db.createObjectStore(STORE_NAMES.presentations, { keyPath: 'presentationId' });
        }
        // すべての単語情報: 主キー wordId（インラインキー）
        if (!db.objectStoreNames.contains(STORE_NAMES.words)) {
          db.createObjectStore(STORE_NAMES.words, { keyPath: 'wordId' });
        }
        // 履歴: 主キー historyId（自動採番）、インデックスで発表id・単語id検索
        if (!db.objectStoreNames.contains(STORE_NAMES.history)) {
          const historyStore = db.createObjectStore(STORE_NAMES.history, {
            keyPath: 'historyId',
            autoIncrement: true,
          });
          historyStore.createIndex('byPresentationId', 'presentationId', { unique: false });
          historyStore.createIndex('byWordId', 'wordId', { unique: false });
        }
        // ピン留め用語（ピン中一覧）。主キー id（Term.id）
        if (!db.objectStoreNames.contains(STORE_NAMES.pinnedTerms)) {
          db.createObjectStore(STORE_NAMES.pinnedTerms, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// --- 発表（presentations）---

export async function putPresentation(row: PresentationRow): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.presentations, 'readwrite');
  await tx.objectStore(STORE_NAMES.presentations).put(row);
  await tx.done;
}

export async function getPresentation(presentationId: string): Promise<PresentationRow | undefined> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.presentations, 'readonly');
  return tx.objectStore(STORE_NAMES.presentations).get(presentationId);
}

export async function getAllPresentations(): Promise<PresentationRow[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.presentations, 'readonly');
  return tx.objectStore(STORE_NAMES.presentations).getAll();
}

// --- 履歴（history）---

export async function putHistory(row: Omit<HistoryRow, 'historyId'>): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.history, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.history);
  const key = await store.put(row as HistoryRow);
  await tx.done;
  return key as number;
}

/** 発表id + 単語id で履歴1件取得（インデックス検索で該当のうち1件） */
export async function getHistoryByPresentationAndWord(
  presentationId: string,
  wordId: string
): Promise<HistoryRow | undefined> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.history, 'readonly');
  const store = tx.objectStore(STORE_NAMES.history);
  const index = store.index('byPresentationId');
  const all = await index.getAll(presentationId);
  await tx.done;
  return all.find((h) => h.wordId === wordId);
}

/** この発表でピン留めされた単語id一覧 */
export async function getPinnedWordIdsByPresentation(presentationId: string): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.history, 'readonly');
  const index = tx.objectStore(STORE_NAMES.history).index('byPresentationId');
  const list = await index.getAll(presentationId);
  await tx.done;
  return list.filter((h) => h.isPinned).map((h) => h.wordId);
}

/** 履歴の upsert: 発表id+単語id が既にあれば更新、なければ追加。ピン留めフラグを設定。 */
export async function setHistoryPinned(
  presentationId: string,
  wordId: string,
  isPinned: boolean
): Promise<void> {
  const existing = await getHistoryByPresentationAndWord(presentationId, wordId);
  if (existing?.historyId != null) {
    await (async () => {
      const db = await getDB();
      const tx = db.transaction(STORE_NAMES.history, 'readwrite');
      await tx.objectStore(STORE_NAMES.history).put({ ...existing, isPinned });
      await tx.done;
    })();
  } else {
    await putHistory({ presentationId, wordId, isPinned });
  }
}

// --- 単語情報（words）---

export async function putWord(row: WordRow): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.words, 'readwrite');
  await tx.objectStore(STORE_NAMES.words).put(row);
  await tx.done;
}

export async function getWord(wordId: string): Promise<WordRow | undefined> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.words, 'readonly');
  return tx.objectStore(STORE_NAMES.words).get(wordId);
}

export async function getAllWords(): Promise<WordRow[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.words, 'readonly');
  return tx.objectStore(STORE_NAMES.words).getAll();
}

// --- ピン留め用語（pinnedTerms）---

/** ピン留め用語を1件保存（Term と同型のオブジェクト） */
export async function addPinnedTerm(term: PinnedTermRow): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.pinnedTerms, 'readwrite');
  await tx.objectStore(STORE_NAMES.pinnedTerms).put(term);
  await tx.done;
}

/** ピン留めを解除 */
export async function removePinnedTerm(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.pinnedTerms, 'readwrite');
  await tx.objectStore(STORE_NAMES.pinnedTerms).delete(id);
  await tx.done;
}

/** ピン留めした用語を全件取得（ピン中一覧用） */
export async function getAllPinnedTerms(): Promise<PinnedTermRow[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAMES.pinnedTerms, 'readonly');
  return tx.objectStore(STORE_NAMES.pinnedTerms).getAll();
}
