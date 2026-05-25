/**
 * `GET /analysis/refer_dictionary_get_scores/stream` への接続と SSE `data` の受信。
 * 1 リクエスト = 解析対象テキスト 1 件（文単位で呼ぶ想定）。
 */
import type { TermRow } from '../mapper/StreamTypes'

/** バックエンドのスコア付き辞書参照 SSE エンドポイント（クエリ `text` 必須） */
export const REFER_DICT_SCORE_STREAM_PATH = '/analysis/refer_dictionary_get_scores/stream'

/**
 * 1 つの SSE イベントの `data` 文字列をパースする。
 * 中身は `TermRow[]` の JSON 配列（db 分・llm 分など chunk ごとに届く）。
 */
export function parseTermRowsFromEventData(data: string): TermRow[] {
  const payload = JSON.parse(data) as unknown
  if (!Array.isArray(payload)) {
    throw new Error('SSE data must be a JSON array')
  }
  return payload as TermRow[]
}

/**
 * EventSource 用の URL を組み立てる。
 * `baseUrl` 省略時は相対パスのみ（`referDictWithOverlaps` と同型。ブラウザは現在オリジン + Vite プロキシ）。
 */
export function buildReferDictScoreStreamUrl(text: string, baseUrl?: string): string {
  const base = baseUrl?.trim() ?? ''
  if (!base) {
    return `${REFER_DICT_SCORE_STREAM_PATH}?text=${encodeURIComponent(text)}`
  }
  try {
    const url = new URL(REFER_DICT_SCORE_STREAM_PATH, base)
    url.searchParams.set('text', text)
    return url.toString()
  } catch {
    return `${base.replace(/\/$/, '')}${REFER_DICT_SCORE_STREAM_PATH}?text=${encodeURIComponent(text)}`
  }
}

export interface StreamReferDictScoreOptions {
  baseUrl?: string
  /** パース済みの 1 chunk（`data` 1 行分） */
  onChunk: (rows: TermRow[]) => void
  onError?: (err: unknown) => void
  signal?: AbortSignal
}

/**
 * 1 文ぶんの SSE を開き、サーバが送る chunk ごとに `onChunk` を呼ぶ。
 * 接続が閉じられたら resolve（1 文のストリーム完了）。
 */
export function streamReferDictScores(
  text: string,
  options: StreamReferDictScoreOptions,
): Promise<void> {
  if (typeof EventSource === 'undefined') {
    return Promise.reject(new Error('EventSource is not available'))
  }

  const url = buildReferDictScoreStreamUrl(text, options.baseUrl)

  return new Promise((resolve, reject) => {
    const es = new EventSource(url)
    let settled = false

    // 正常終了・エラー・abort のいずれかで一度だけ後始末する
    const finish = (err?: unknown) => {
      if (settled) return
      settled = true
      es.close()
      if (err) {
        options.onError?.(err)
        reject(err)
      } else {
        resolve()
      }
    }

    // DB ヒット分 → LLM 追加分の順で複数回届く
    es.onmessage = (event) => {
      try {
        const rows = parseTermRowsFromEventData(event.data)
        if (rows.length > 0) options.onChunk(rows)
      } catch (err) {
        finish(err)
      }
    }

    // サーバがストリームを閉じると CLOSED になる（正常終了として扱う）
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        finish()
      } else {
        finish(new Error('SSE connection failed'))
      }
    }

    options.signal?.addEventListener('abort', () => finish(new Error('aborted')), { once: true })
  })
}
