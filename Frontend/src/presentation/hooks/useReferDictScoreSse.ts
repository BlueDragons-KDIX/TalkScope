/**
 * 文字起こし（transcript）を監視し、完了した文ごとにスコア SSE を開く。
 *
 * - 文分割・送信タイミングは `useReferDict`（POST）と同型（`splitIntoSentences` 等）
 * - HTTP/SSE は `streamReferDictScores`
 * - ストアへの add / upsert は行わない（`onChunk` / `onTerms` に任せる）
 */
import { useCallback, useEffect, useRef } from 'react'
import { splitIntoSentences } from '../../app/utils/sentenceSplit'
import type { Term } from '../../domain/entities/Term'
import { mapToTerms } from '../../infrastructure/mapper'
import type { TermRow } from '../../infrastructure/mapper/StreamTypes'
import { streamReferDictScores } from '../../infrastructure/sse/referDictScoreStream'
import { useTranscriptStore } from '../../stores/transcriptStore'

/** 全文が句点等で終わっているか。`true` なら末尾文も「完了」として送れる */
const SENTENCE_END_RE = /[。．.!?！？\n]\s*$/
const MAX_CONSECUTIVE_ERRORS = 5
/** 話し途中の末尾 1 文を送るまでの待ち（ms） */
const DEFAULT_TRAILING_DEBOUNCE_MS = 1000

export interface UseReferDictScoreSseOptions {
  baseUrl?: string
  trailingDebounceMs?: number
  onChunk?: (rows: TermRow[]) => void
  onTerms?: (terms: Term[]) => void
  onError?: (err: unknown) => void
}

function resolveBaseUrl(override?: string): string {
  return (override ?? import.meta.env.VITE_BACKEND_URL ?? '').trim()
}

export function useReferDictScoreSse(options: UseReferDictScoreSseOptions = {}): void {
  const transcript = useTranscriptStore((s) => s.transcript)
  const {
    baseUrl: baseUrlOption,
    trailingDebounceMs = DEFAULT_TRAILING_DEBOUNCE_MS,
    onChunk,
    onTerms,
    onError,
  } = options

  const baseUrl = resolveBaseUrl(baseUrlOption)

  // --- 送信状態（レンダー間で保持） ---

  /** `splitIntoSentences` の何番目まで送ったか（exclusive）。同じ文は二重送信しない */
  const lastSentIndexRef = useRef(0)
  /** `sendRange` の再入防止。並列で複数 EventSource を開かない */
  const sendingRef = useRef(false)
  /** SSE 失敗が続いたらしばらく新規接続を開かない */
  const consecutiveErrorsRef = useRef(0)

  // コールバックは effect / sendRange の依存に入れず、ref で常に最新を参照
  const onChunkRef = useRef(onChunk)
  const onTermsRef = useRef(onTerms)
  const onErrorRef = useRef(onError)
  onChunkRef.current = onChunk
  onTermsRef.current = onTerms
  onErrorRef.current = onError

  /** 1 chunk ごと: API 行配列 →（任意）`mapToTerms` → 呼び出し側 */
  const deliverChunk = useCallback((rows: TermRow[]) => {
    onChunkRef.current?.(rows)
    if (onTermsRef.current) {
      onTermsRef.current(mapToTerms(rows))
    }
  }, [])

  /**
   * `sentences[from..to)` を先頭から順に 1 文ずつ SSE へ送る。
   *
   * @param treatLastAsUncompleted - `true` のとき最後の 1 文は「未完了扱い」
   *   （成功しても `lastSentIndex` を進めない → 入力継続時に再評価できる）
   */
  const sendRange = useCallback(
    async (
      sentences: string[],
      from: number,
      to: number,
      treatLastAsUncompleted = false,
    ) => {
      if (sendingRef.current) return
      if (from >= to) return
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        if (import.meta.env.DEV) {
          console.warn(
            `[referDictScoreSse] ${MAX_CONSECUTIVE_ERRORS}回連続エラーのため送信停止中。`,
          )
        }
        return
      }

      sendingRef.current = true
      try {
        for (let i = from; i < to; i++) {
          const text = sentences[i]?.trim()

          // 名詞抽出の前提として短すぎる文(2文字未満)は API に送らない（インデックスだけ進める）
          if (!text || text.length < 2) {
            lastSentIndexRef.current = i + 1
            continue
          }

          const isCurrentUncompleted = treatLastAsUncompleted && i === to - 1

          try {
            // 1 文 = 1 本の EventSource。chunk は `deliverChunk` 経由で上に上がる
            await streamReferDictScores(text, {
              baseUrl,
              onChunk: deliverChunk,
              onError: onErrorRef.current,
            })
            consecutiveErrorsRef.current = 0

            // 完了文: 成功したら次回はこの次の文から
            // 未完了文（debounce 対象）: インデックスを進めず、追記後に再送できるようにする
            if (!isCurrentUncompleted) {
              lastSentIndexRef.current = i + 1
            }
            if (import.meta.env.DEV) {
              console.log(`[referDictScoreSse] sent "${text.slice(0, 40)}"`)
            }
          } catch (err) {
            consecutiveErrorsRef.current += 1
            onErrorRef.current?.(err)
            // 失敗した完了文はスキップして先へ。未完了文はインデックスを残す
            if (!isCurrentUncompleted) {
              lastSentIndexRef.current = i + 1
            }
            break
          }
        }
      } finally {
        sendingRef.current = false
      }
    },
    [baseUrl, deliverChunk],
  )

  /**
   * transcript が更新されるたびに実行。
   *
   * ① 新しく「句点で終わった」文 → `sendRange`（即座に送信）
   * ② 末尾が未完了 → debounce 後に末尾 1 文だけ `sendRange(..., treatLastAsUncompleted=true)`
   */
  useEffect(() => {
    if (!transcript?.trim()) {
      lastSentIndexRef.current = 0
      consecutiveErrorsRef.current = 0
      return
    }

    const sentences = splitIntoSentences(transcript)
    if (sentences.length === 0) return

    const currentEnd = lastSentIndexRef.current
    const endsComplete = SENTENCE_END_RE.test(transcript)

    // 例: 文が 3 つで末尾に句点なし → completeCount=2（最後は話し途中）
    // 例: 全文が「...。」で終わる → completeCount=3（すべて完了）
    const completeCount = endsComplete
      ? sentences.length
      : Math.max(0, sentences.length - 1)

    if (completeCount > currentEnd) {
      void sendRange(sentences, currentEnd, completeCount)
    }

    if (!endsComplete && sentences.length > completeCount && trailingDebounceMs > 0) {
      const timer = setTimeout(() => {
        const idx = lastSentIndexRef.current
        if (sentences.length > idx) {
          void sendRange(sentences, idx, sentences.length, true)
        }
      }, trailingDebounceMs)
      return () => clearTimeout(timer)
    }
  }, [transcript, sendRange, trailingDebounceMs])
}
