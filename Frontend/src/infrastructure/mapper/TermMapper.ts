/**
 * `GET /analysis/refer_dictionary_get_scores/stream` の 応答を `Term[]` に変換する。
 *
 * `id`→`id`, `term`→`word`, `score`→`score`, `description`→`shortDesc`/`longDesc`（同一文）。
 * `kana`・`category` は空文字、`relatedTerms` は空配列。
 */
import type { Term } from '../../domain/entities/Term'
import type { TermRow } from './StreamTypes'

const EMPTY_LEGACY = {
  kana: '',
  category: '',
  relatedTerms: [] as string[],
} satisfies Pick<Term, 'kana' | 'category' | 'relatedTerms'>

export function mapToTerm(row: TermRow): Term {
  // const id = String(row.id)
  const word = row.term.trim()
  const desc = row.description.trim()
  const id = word+"-"+desc.slice(0,5)
  return {
    id,
    word,
    shortDesc: desc,
    longDesc: desc,
    score: row.score,
    ...EMPTY_LEGACY,
  }
}

export function mapToTerms(rows: TermRow[]): Term[] {
  return rows.map(mapToTerm)
}
