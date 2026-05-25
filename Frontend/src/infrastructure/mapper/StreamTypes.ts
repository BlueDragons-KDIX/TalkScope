/**
 * `GET /analysis/refer_dictionary_get_scores/stream` の SSE `data` 配列の型。
 * 正は Backend `ResponseTermScore`（`app/schemas/dictionary.py`）。
 */

export interface TermRow {
  id: string
  term: string
  description: string
  score: number
  source: string
}
