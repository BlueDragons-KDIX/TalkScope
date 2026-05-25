/**
 * refer_dictionary_get_scores（SSE）一式。
 * 接続・パース・transcript 監視。`Term` への変換は mapper。ストア反映は呼び出し側。
 */
export {
  REFER_DICT_SCORE_STREAM_PATH,
  buildReferDictScoreStreamUrl,
  parseTermRowsFromEventData,
  streamReferDictScores,
  type StreamReferDictScoreOptions,
} from './referDictScoreStream'
export { useReferDictScoreSse, type UseReferDictScoreSseOptions } from '../../presentation/hooks/useReferDictScoreSse'
export { ReferDictScoreSseBridge } from '../../presentation/components/ReferDictScoreSseBridge'
