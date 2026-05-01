/**
 * サーバー未接続時の「重要単語マーキング」デモ用。
 * テストポップアップで ON にしたときのみ transcript から検出してストアへ載せる。
 */
import type { Term } from '../../domain/entities/Term'

export const DEMO_IMPORTANT_TERM_ID_PREFIX = 'demo-important-' as const

/** `DEMO_TEXT_INSTANT` / `DEMO_TEXT_STREAM` によく出る語からピックアップ */
export const MOCK_IMPORTANT_TERMS: Term[] = [
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}react`,
    word: 'React',
    kana: 'リアクト',
    shortDesc: '[デモ] UIライブラリ',
    longDesc: 'コンポーネントベースのフロントエンド向けライブラリ（デモデータ）。',
    category: 'Frontend',
    level: 1,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}typescript`,
    word: 'TypeScript',
    kana: 'タイプスクリプト',
    shortDesc: '[デモ] 型付きJavaScript',
    longDesc: 'JavaScriptに静的型付けを足した言語（デモデータ）。',
    category: 'Frontend',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}docker`,
    word: 'Docker',
    kana: 'ドッカー',
    shortDesc: '[デモ] コンテナ',
    longDesc: 'アプリケーションのコンテナ化（デモデータ）。',
    category: 'Infra',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}aws`,
    word: 'AWS',
    kana: '',
    shortDesc: '[デモ] クラウド',
    longDesc: 'Amazon Web Services（デモデータ）。',
    category: 'Infra',
    level: 1,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}cicd`,
    word: 'CI/CD',
    kana: '',
    shortDesc: '[デモ] 継続的インテグレーション',
    longDesc: 'ビルド・テスト・デプロイの自動化（デモデータ）。',
    category: 'Infra',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}github`,
    word: 'GitHub',
    kana: 'ギットハブ',
    shortDesc: '[デモ] リポジトリホスティング',
    longDesc: 'ソースコード管理と CI のトリガーに利用（デモデータ）。',
    category: 'General',
    level: 1,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}sql`,
    word: 'SQL',
    kana: 'エスキューエル',
    shortDesc: '[デモ] 関係DB向け言語',
    longDesc: 'リレーショナルデータベース向けクエリ言語（デモデータ）。',
    category: 'Backend',
    level: 1,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}nosql`,
    word: 'NoSQL',
    kana: 'ノーエスキューエル',
    shortDesc: '[デモ] 非リレーショナルDB',
    longDesc: 'ドキュメント・KV などの非リレーショナル DB（デモデータ）。',
    category: 'Backend',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}llm`,
    word: 'LLM',
    kana: '',
    shortDesc: '[デモ] 大規模言語モデル',
    longDesc: '大規模言語モデル（デモデータ）。',
    category: 'AI/Data',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}api`,
    word: 'API',
    kana: 'エーピーアイ',
    shortDesc: '[デモ] アプリケーションインターフェース',
    longDesc: 'システム間のプログラム境界（デモデータ）。',
    category: 'Backend',
    level: 1,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}kubernetes`,
    word: 'Kubernetes',
    kana: 'クバネティス',
    shortDesc: '[デモ] コンテナオーケストレーション',
    longDesc: 'コンテナのスケール・自己修復など（デモデータ）。',
    category: 'Infra',
    level: 3,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}graphql`,
    word: 'GraphQL',
    kana: 'グラフキューエル',
    shortDesc: '[デモ] クエリ言語',
    longDesc: 'クライアントが必要なフィールドだけ取得する API スタイル（デモデータ）。',
    category: 'Backend',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}fastapi`,
    word: 'FastAPI',
    kana: 'ファストエーピーアイ',
    shortDesc: '[デモ] Python Webフレームワーク',
    longDesc: '高速な Python REST API 構築（デモデータ）。',
    category: 'Backend',
    level: 2,
    relatedTerms: [],
  },
  {
    id: `${DEMO_IMPORTANT_TERM_ID_PREFIX}mongodb`,
    word: 'MongoDB',
    kana: 'モンゴディービー',
    shortDesc: '[デモ] ドキュメントDB',
    longDesc: 'ドキュメント指向 NoSQL（デモデータ）。',
    category: 'Backend',
    level: 2,
    relatedTerms: [],
  },
]

/** transcript 内に現れるモック重要語のみ返す（マーキング・バブル同期用） */
export function findMockImportantTermsInText(text: string): Term[] {
  if (!text.trim()) return []
  const out: Term[] = []
  for (const term of MOCK_IMPORTANT_TERMS) {
    const word = term.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const kanaEsc = term.kana.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const reWord = new RegExp(word, 'gi')
    const reKana = kanaEsc ? new RegExp(kanaEsc, 'g') : null
    const wordMatches = text.match(reWord)
    const kanaMatches = reKana ? text.match(reKana) : null
    const count = (wordMatches?.length ?? 0) + (kanaMatches?.length ?? 0)
    if (count > 0) out.push(term)
  }
  return out
}
