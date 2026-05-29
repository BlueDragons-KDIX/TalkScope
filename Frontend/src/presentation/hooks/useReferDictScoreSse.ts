/**
 * 文字起こし（transcript）を監視し、完了した文ごとにスコア SSE を開く。
 *
 * - 文分割・送信タイミングは `useReferDict`（POST）と同型（`splitIntoSentences` 等）
 * - HTTP/SSE は `streamReferDictScores`
 * - ストアへの add / upsert は行わない（`onChunk` / `onTerms` に任せる）
 */
import { useCallback, useEffect, useRef } from 'react'
import {
  splitIntoSentences,
  stripTrailingSentenceDelimiters,
} from '../../app/utils/sentenceSplit'
import type { Term } from '../../domain/entities/Term'
import { mapToTerms } from '../../infrastructure/mapper'
import type { TermRow } from '../../infrastructure/mapper/StreamTypes'
import { streamReferDictScores } from '../../infrastructure/sse/referDictScoreStream'
import { useTranscriptStore } from '../../stores/transcriptStore'

/** 全文が句点等で終わっているか。`true` なら末尾文も「完了」として送れる */
const SENTENCE_END_RE = /[。．.!?！？\n]\s*$/
/** 話し途中の末尾 1 文を送るまでの待ち（ms） */
const DEFAULT_TRAILING_DEBOUNCE_MS = 1500

export interface UseReferDictScoreSseOptions {
  baseUrl?: string
  trailingDebounceMs?: number
  onBeforeSend?: (text: string) => void
  onRequestOpened?: (text: string) => void
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
    onBeforeSend,
    onRequestOpened,
    onChunk,
    onTerms,
    onError,
  } = options

  const baseUrl = resolveBaseUrl(baseUrlOption)

  // --- 送信状態（レンダー間で保持） ---

  /** `splitIntoSentences` の何番目まで送ったか（exclusive）。同じ文は二重送信しない */
  const lastSentIndexRef = useRef(0)
  /** `sendRange` の再入防止。並列で複数 EventSource を開かない */
  // const sendingRef = useRef(false)


  /** このセッションで送信開始済みのキー（句点除去後）。失敗時のみ削除してリトライ可 */
  const sentSendTextsRef = useRef<Set<string>>(new Set())

  // コールバックは effect / sendRange の依存に入れず、ref で常に最新を参照
  const onChunkRef = useRef(onChunk)
  const onTermsRef = useRef(onTerms)
  const onErrorRef = useRef(onError)
  const onBeforeSendRef = useRef(onBeforeSend)
  const onRequestOpenedRef = useRef(onRequestOpened)
  onChunkRef.current = onChunk
  onTermsRef.current = onTerms
  onErrorRef.current = onError
  onBeforeSendRef.current = onBeforeSend
  onRequestOpenedRef.current = onRequestOpened

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
      // if (sendingRef.current) return
      if (from >= to) return

      // 並列送信: SSE 完了を待たずループが終わるため、完了文は先に lastSentIndex を進めて二重 sendRange を防ぐ
      {
        const claimEnd = treatLastAsUncompleted ? to - 1 : to
        if (claimEnd > from) {
          if (lastSentIndexRef.current >= claimEnd) return
          lastSentIndexRef.current = claimEnd
        }
      }

      // sendingRef.current = true
      try {
        for (let i = from; i < to; i++) {
          const raw = sentences[i]?.trim()
          const sendText = raw ? stripTrailingSentenceDelimiters(raw) : ''

          // 名詞抽出の前提として短すぎる文(2文字未満)は API に送らない（インデックスだけ進める）
          if (!sendText || sendText.length < 2) {
            lastSentIndexRef.current = i + 1
            continue
          }

          const isCurrentUncompleted = treatLastAsUncompleted && i === to - 1

          // 句点除去後のキーで既に送っていればスキップ（別インデックス・debounce→確定のレース含む）
          if (sentSendTextsRef.current.has(sendText)) {
            continue
          }
          sentSendTextsRef.current.add(sendText)

          try {
            onBeforeSendRef.current?.(sendText)
            // 1 文 = 1 本の EventSource。chunk は `deliverChunk` 経由で上に上がる
            void streamReferDictScores(sendText, {
              baseUrl,
              onOpen: () => onRequestOpenedRef.current?.(sendText),
              onChunk: deliverChunk,
              onError: onErrorRef.current,
            }).then(() => {

            // 完了文: 成功したら次回はこの次の文から
            // 未完了文（debounce 対象）: インデックスを進めず、追記後に再送できるようにする
            if (!isCurrentUncompleted) {
              // 並列完了順がばらついても lastSentIndex が巻き戻らないようにする
              lastSentIndexRef.current = Math.max(lastSentIndexRef.current, i + 1)
            }
            if (import.meta.env.DEV) {
              console.log(`[referDictScoreSse] sent "${sendText.slice(0, 40)}"`)
            }
          // 非同期のエラー処理
          }).catch((err) => {
            sentSendTextsRef.current.delete(sendText)
            onErrorRef.current?.(err)
            // 失敗した完了文はスキップして先へ。未完了文はインデックスを残す
            if (!isCurrentUncompleted) {
              lastSentIndexRef.current = Math.max(lastSentIndexRef.current, i + 1)
            }
          })
          } catch (err) {
            sentSendTextsRef.current.delete(sendText)
            onErrorRef.current?.(err)
            // 失敗した完了文はスキップして先へ。未完了文はインデックスを残す
            if (!isCurrentUncompleted) {
              lastSentIndexRef.current = i + 1
            }
            // break
          }
        }
      } finally {
        // sendingRef.current = false
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
      sentSendTextsRef.current.clear()
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
        // effect クロージャの sentences ではなく、発火時点の最新 transcript で送る
        const latest = splitIntoSentences(useTranscriptStore.getState().transcript)
        const idx = lastSentIndexRef.current
        if (latest.length > idx) {
          void sendRange(latest, idx, latest.length, true)
        }
      }, trailingDebounceMs)
      return () => clearTimeout(timer)
    }
  }, [transcript, sendRange, trailingDebounceMs])
}
