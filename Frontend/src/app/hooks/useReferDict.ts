import { useRef, useCallback, useEffect } from 'react';
import { splitIntoSentences } from '../utils/sentenceSplit';
import {
  sendReferDictRequest,
  firstSentence,
  type ReferDictEntry,
  type ReferDictResponse,
} from '../utils/referDictWithOverlaps';
import type { Term } from '../data/terms';



// ── 公開型 ───────────────────────────────────────────────────
/** API から得た用語情報（Term + ベクトル + ソース） */
export interface DictTermResult {
  term: Term;
  meaningVector: number[] | null;
  source: string;
}

export interface UseReferDictOptions {
  baseUrl?: string;
  /** タイマー送信の間隔(秒)。0 で無効。句点のない末尾文の保険用 */
  intervalSec?: number;
  /** 末尾の未完了文を送るまでのデバウンス(ms)。デフォルト 3000 */
  trailingDebounceMs?: number;
  /** 送信完了コールバック */
  onResults?: (results: DictTermResult[], response: ReferDictResponse) => void;
  onError?: (err: unknown) => void;
}

// ── ヘルパー ──────────────────────────────────────────────────
let _idCounter = 0;
/** API 用語から Term オブジェクトを生成する */
function entryToTerm(entry: ReferDictEntry): Term {
  _idCounter += 1;
  return {
    id: `api-${entry.term}-${_idCounter}`,
    word: entry.term,
    kana: '',
    shortDesc: firstSentence(entry.description),
    longDesc: entry.description,
    category: 'General',
    level: 1,
    relatedTerms: [],
  };
}

function entryToResult(entry: ReferDictEntry): DictTermResult {
  return {
    term: entryToTerm(entry),
    meaningVector: entry.meaning_vector ?? null,
    source: entry.source,
  };
}

/** テキストが文末記号で終わっているか */
const SENTENCE_END_RE = /[。．.!?！？\n]\s*$/;

// ── フック本体 ────────────────────────────────────────────────
/**
 * transcript が更新されるたびに、**完了した文**（句点等で区切られた文）を
 * 1 文ずつ refer_dictionary API に送り、用語・説明・ベクトルを受け取る。
 *
 * ストリーミング入力に対応:
 *   - 句点で区切られた完了文は即座に送信
 *   - 末尾の未完了文は trailingDebounceMs 後に送信（入力が止まったとき）
 *   - intervalSec のタイマーで定期的にフォールバック送信
 */
export function useReferDict(
  transcript: string,
  options: UseReferDictOptions = {},
) {
  const {
    baseUrl,
    intervalSec = 0,
    trailingDebounceMs = 3000,
    onResults,
    onError,
  } = options;

  /** 送信済み文インデックス（sentences 配列の exclusive 上限） */
  const lastSentIndexRef = useRef(0);
  /** 送信中フラグ（並列送信を防ぐ） */
  const sendingRef = useRef(false);
  /** 同一用語の重複を排除するためのセット */
  const seenTermsRef = useRef<Set<string>>(new Set());
  /** 連続エラー回数（無限リトライ防止） */
  const consecutiveErrorsRef = useRef(0);
  const MAX_CONSECUTIVE_ERRORS = 5;

  /**
   * sentences[from..to) を順に 1 文ずつ API に送信する。
   * `sendingRef` で排他制御し、失敗時はそこで打ち切り。
   */
  const sendRange = useCallback(async (
    sentences: string[],
    from: number,
    to: number,
    treatLastAsUncompleted: boolean = false
  ) => {
    if (sendingRef.current) return;
    if (from >= to) return;
    if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
      if (import.meta.env.DEV) {
        console.warn(
          `[referDict] ${MAX_CONSECUTIVE_ERRORS}回連続エラーのため送信停止中。` +
          'リセットすると復帰します。',
        );
      }
      return;
    }
    sendingRef.current = true;

    const url = baseUrl ?? '';

    try {
      for (let i = from; i < to; i++) {
        const text = sentences[i]?.trim();
        // 2 文字未満は名詞が含まれない可能性が高いのでスキップ
        if (!text || text.length < 2) {
          lastSentIndexRef.current = i + 1;
          continue;
        }

        const isCurrentUncompleted = treatLastAsUncompleted && i === to - 1;

        try {

          const response = await sendReferDictRequest(
            { text, sentenceIndex: i },
            url,
          );

          consecutiveErrorsRef.current = 0;
          if (!isCurrentUncompleted) {
            lastSentIndexRef.current = i + 1;
          }

          // 新規用語だけフィルタして通知
          const newResults: DictTermResult[] = [];
          for (const entry of response.entries) {
            if (!seenTermsRef.current.has(entry.term)) {
              seenTermsRef.current.add(entry.term);
              newResults.push(entryToResult(entry));
            }
          }

          if (newResults.length > 0) {
            onResults?.(newResults, response);
          }

          if (import.meta.env.DEV) {
            console.log(
              `[referDict] sent "${text.slice(0, 40)}"`,
              `→ ${response.entries.length} entries (${newResults.length} new)`,
            );
          }
        } catch (err: unknown) {
          consecutiveErrorsRef.current += 1;
          onError?.(err);
          // エラーが起きても無限ループを防ぐため、完了文ならインデックスを進める（スキップする）
          // [未完了]文の送信失敗時は次回送信チャレンジを残す（consecutiveErrorsRefで無限ループは防がれる）
          if (!isCurrentUncompleted) {
            lastSentIndexRef.current = i + 1;
          }
          break;
        }
      }
    } finally {
      sendingRef.current = false;
    }
  }, [baseUrl, onResults, onError]);

  // ── 完了文の即時送信 + 末尾未完了文のデバウンス ─────────────
  useEffect(() => {
    if (!transcript?.trim()) return;

    const sentences = splitIntoSentences(transcript);
    if (sentences.length === 0) return;

    const currentEnd = lastSentIndexRef.current;

    // テキストが文末記号で終わっている → 全文完了
    const endsComplete = SENTENCE_END_RE.test(transcript);
    // 完了文の数（末尾が未完了なら最後の1文を除く）
    const completeCount = endsComplete
      ? sentences.length
      : Math.max(0, sentences.length - 1);

    // 完了文があれば即送信
    if (completeCount > currentEnd) {
      sendRange(sentences, currentEnd, completeCount);
    }

    // 末尾に未完了文がある場合はデバウンスで送信
    // （入力が trailingDebounceMs の間止まったら送信）
    if (!endsComplete && sentences.length > completeCount && trailingDebounceMs > 0) {
      const timer = setTimeout(() => {
        // タイマー発火時点でまだ未送信なら送信
        const idx = lastSentIndexRef.current;
        if (sentences.length > idx) {
          sendRange(sentences, idx, sentences.length, true);
        }
      }, trailingDebounceMs);
      return () => clearTimeout(timer);
    }
  }, [transcript, sendRange, trailingDebounceMs]);

  // ── タイマー送信（フォールバック） ─────────────────────────
  useEffect(() => {
    if (intervalSec <= 0) return;
    const id = setInterval(() => {
      const sentences = splitIntoSentences(transcript);
      const endsComplete = SENTENCE_END_RE.test(transcript);
      const idx = lastSentIndexRef.current;
      if (sentences.length > idx) {
        sendRange(sentences, idx, sentences.length, !endsComplete);
      }
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [intervalSec, transcript, sendRange]);

  // ── トランスクリプトクリア時のリセット ─────────────────────
  useEffect(() => {
    if (!transcript?.trim()) {
      lastSentIndexRef.current = 0;
      seenTermsRef.current.clear();
      consecutiveErrorsRef.current = 0;
    }
  }, [transcript]);

  /** 手動送信（未送信文を全て送る） */
  const send = useCallback(() => {
    const sentences = splitIntoSentences(transcript);
    const endsComplete = SENTENCE_END_RE.test(transcript);
    if (sentences.length > lastSentIndexRef.current) {
      sendRange(sentences, lastSentIndexRef.current, sentences.length, !endsComplete);
    }
  }, [transcript, sendRange]);

  return { send };
}
