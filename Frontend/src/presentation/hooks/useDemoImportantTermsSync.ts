import { useEffect } from 'react'
import { useTranscriptStore } from '../../stores/transcriptStore'
import { useDemoImportantMarkingStore } from '../../stores/demoImportantMarkingStore'
import { useTermStore } from '../../stores/termStore'
import { findMockImportantTermsInText } from '../../debug/demo/mockImportantTerms'

/**
 * デモ「重要単語マーキング」ON 時、文字起こしからモック語リストに一致する用語を検出し activeTerms に載せる。
 * サーバー連携後は本同期を差し替える想定。
 */
export function useDemoImportantTermsSync(): void {
  const transcript = useTranscriptStore(s => s.transcript)
  const enabled = useDemoImportantMarkingStore(s => s.enabled)

  useEffect(() => {
    const { stripDemoImportantTerms, addTerms } = useTermStore.getState()
    stripDemoImportantTerms()
    if (!enabled || !transcript.trim()) return
    const found = findMockImportantTermsInText(transcript)
    if (found.length > 0) addTerms(found)
  }, [transcript, enabled])
}
