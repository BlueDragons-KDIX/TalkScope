/**
 * IndexedDB 動作確認用パネル。
 * テストデータの書き込み・読み取りを行い、結果を表示する。
 */

import React, { useState } from 'react';
import { Database, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  getDB,
  putPresentation,
  getPresentation,
  getAllPresentations,
  putWord,
  getWord,
  getAllWords,
  setHistoryPinned,
  getHistoryByPresentationAndWord,
  getPinnedWordIdsByPresentation,
} from '@/app/db';

const TEST_PRESENTATION_ID = 'test-pres-1';
const TEST_WORD_ID = 'test-word-1';

export const DbTestPanel: React.FC<{ darkMode?: boolean }> = ({ darkMode: dk = true }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    detail?: string;
  } | null>(null);

  const runTest = async () => {
    setRunning(true);
    setResult(null);
    const logs: string[] = [];
    try {
      // 1. DB オープン
      const db = await getDB();
      logs.push(`DB オープン: ${db.name} ver${db.version}`);

      // 2. 発表を 1 件保存
      await putPresentation({
        presentationId: TEST_PRESENTATION_ID,
        fullText: 'テスト会話の全文です。',
        conversationVector: [0.1, 0.2, 0.3],
        themeVector: [0.4, 0.5, 0.6],
        themeText: 'テスト主題',
      });
      logs.push('putPresentation: OK');

      // 3. 発表を 1 件取得
      const pres = await getPresentation(TEST_PRESENTATION_ID);
      if (!pres || pres.fullText !== 'テスト会話の全文です。') {
        throw new Error('getPresentation の結果が一致しません');
      }
      logs.push('getPresentation: OK');

      // 4. 単語を 1 件保存
      await putWord({
        wordId: TEST_WORD_ID,
        word: 'テスト単語',
        explanation: 'テスト用の解説です。',
        vector: [0.7, 0.8, 0.9],
        isUnderstood: false,
        relatedWords: ['関連1', '関連2'],
      });
      logs.push('putWord: OK');

      // 5. 単語を 1 件取得
      const word = await getWord(TEST_WORD_ID);
      if (!word || word.word !== 'テスト単語') {
        throw new Error('getWord の結果が一致しません');
      }
      logs.push('getWord: OK');

      // 6. 履歴（ピン留め）を保存
      await setHistoryPinned(TEST_PRESENTATION_ID, TEST_WORD_ID, true);
      logs.push('setHistoryPinned: OK');

      // 7. 履歴を発表id+単語idで取得
      const hist = await getHistoryByPresentationAndWord(TEST_PRESENTATION_ID, TEST_WORD_ID);
      if (!hist || !hist.isPinned) {
        throw new Error('getHistoryByPresentationAndWord の結果が一致しません');
      }
      logs.push('getHistoryByPresentationAndWord: OK');

      // 8. この発表のピン留め単語一覧
      const pinnedIds = await getPinnedWordIdsByPresentation(TEST_PRESENTATION_ID);
      if (!pinnedIds.includes(TEST_WORD_ID)) {
        throw new Error('getPinnedWordIdsByPresentation に test-word-1 が含まれません');
      }
      logs.push('getPinnedWordIdsByPresentation: OK');

      // 9. 全件取得（件数だけ確認）
      const allPres = await getAllPresentations();
      const allWords = await getAllWords();
      logs.push(`getAll: 発表 ${allPres.length} 件, 単語 ${allWords.length} 件`);

      setResult({
        ok: true,
        message: 'すべてのテストに合格しました。',
        detail: logs.join('\n'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({
        ok: false,
        message: 'テスト失敗',
        detail: [message, ...logs].filter(Boolean).join('\n'),
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${dk ? 'bg-slate-900/30 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Database size={16} className={dk ? 'text-slate-500' : 'text-slate-400'} />
        <span className={`text-sm font-bold ${dk ? 'text-slate-300' : 'text-slate-700'}`}>IndexedDB 動作確認</span>
      </div>
      <p className={`text-xs mb-3 ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
        発表・単語・履歴の保存・取得を実行し、結果を表示します。
      </p>
      <button
        onClick={runTest}
        disabled={running}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
          dk
            ? 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:bg-slate-700/80 disabled:opacity-50'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50'
        }`}
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {running ? '実行中...' : 'テスト実行'}
      </button>

      {result && (
        <div
          className={`mt-3 p-3 rounded-lg border text-xs ${
            result.ok
              ? dk
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : dk
                ? 'bg-red-950/30 border-red-800/50 text-red-200'
                : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {result.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span className="font-bold">{result.message}</span>
          </div>
          {result.detail && (
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono opacity-90">{result.detail}</pre>
          )}
        </div>
      )}
    </div>
  );
};
