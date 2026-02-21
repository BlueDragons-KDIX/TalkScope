import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDemoStream } from './hooks/useDemoStream';
import { useVectorSend } from '@/app/hooks/useVectorSend';
import type { VectorPayload } from '@/app/utils/vectorSendWithOverlap';
import { DEMO_TEXT_INSTANT } from './demo/demo';
import { TranscriptionView } from './components/TranscriptionView';
import { BubbleCloud } from './components/BubbleCloud';
import { TermDetailPanel } from './components/TermDetailPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Term } from './data/terms';
import { extractTerms } from './utils/termDetection';
import { Book, LayoutGrid, Settings } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { VectorApiCheckButton } from './components/VectorApiCheckButton';
import { Toaster, toast } from 'sonner';
import { LayoutEngine } from './layout/LayoutEngine';
import { LayoutNode, PanelId } from './layout/types';
import {
  makeDefaultLayout,
  make2x2Layout,
  makeHorizontalLayout,
  makeVerticalLayout,
  makeLeftRightLayout,
} from './layout/layoutUtils';



// レイアウトプリセット定義
const PRESETS = [
  { key: 'default', label: 'デフォルト', make: makeDefaultLayout },
  { key: 'leftRight', label: '左右+縦分割', make: makeLeftRightLayout },
  { key: '2x2', label: '2×2', make: make2x2Layout },
  { key: 'horizontal', label: '横4列', make: makeHorizontalLayout },
  { key: 'vertical', label: '縦4列', make: makeVerticalLayout },
] as const;

const App: React.FC = () => {
  const { transcript, setTranscript, isListening, startListening, stopListening, error } = useSpeechRecognition();

  const [activeTerms, setActiveTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [termWeights, setTermWeights] = useState<Record<string, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchHistory, setSearchHistory] = useState<Term[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutNode>(makeDefaultLayout);
  const [settings, setSettings] = useState({ darkMode: true, themeColor: 'indigo', sensitivity: 50 });
  const [pinnedTermIds, setPinnedTermIds] = useState<Set<string>>(new Set());

  // ── バブル寿命管理 refs ────────────────────────────────────────
  const termTimestamps    = useRef<Record<string, number>>({});       // termId → 追加時刻
  const termImportance    = useRef<Record<string, number>>({});       // termId → 重要度スコア（クリック数以外の変数も将来加算）
  const autoPinnedSet     = useRef<Set<string>>(new Set());           // 自動ピン済み ID（再ピン防止）
  const pinnedTermIdsRef  = useRef<Set<string>>(new Set());           // pinnedTermIds の ref ミラー
  const activeTermsRef    = useRef<Term[]>([]);                       // activeTerms の ref ミラー

  // ── デモ機能（コア機能から独立） ──────────────────────────────
  const demoStream = useDemoStream({
    onAppend: (text) => setTranscript(text),
    intervalMs: 220,
  });
  // ──────────────────────────────────────────────────────────────

  useVectorSend(transcript, {
    overlapSentences: Number(import.meta.env.VITE_VECTOR_OVERLAP_SENTENCES) || 5,
    sendEveryNSentences: Number(import.meta.env.VITE_VECTOR_SEND_EVERY_N_SENTENCES) || 5,
    intervalSec: Number(import.meta.env.VITE_VECTOR_SEND_INTERVAL_SEC) || 0,
    onSent: (payload: VectorPayload, result?: unknown) => {
      if (import.meta.env.DEV) console.log('[vector] payload', payload.sentences.length, result);
    },
    onError: (err: unknown) => console.warn('[vector] send error', err),
  });

  const dk = settings.darkMode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dk);
  }, [dk]);

  useEffect(() => { if (error) toast.error(error); }, [error]);

  // refs の同期
  useEffect(() => { pinnedTermIdsRef.current = pinnedTermIds; }, [pinnedTermIds]);
  useEffect(() => { activeTermsRef.current = activeTerms; }, [activeTerms]);

  useEffect(() => {
    if (!transcript) return;
    const extracted = extractTerms(transcript);
    const now = Date.now();
    setActiveTerms(prev => {
      const ids = new Set(prev.map(t => t.id));
      const newTerms = extracted.filter(t => !ids.has(t.id));
      newTerms.forEach(t => { termTimestamps.current[t.id] = now; });
      return [...prev, ...newTerms];
    });
  }, [transcript]);

  // ── バブル削除アルゴリズム (3秒ごとに実行) ───────────────────
  useEffect(() => {
    const MAX_BUBBLES        = 25;  // この数以内は削除しない
    const OLDEST_BATCH       = 10;  // 最古から何件をバッチ評価するか
    const SURVIVAL_BOOST     = 1;   // 生き残りに加算する重要度
    const AUTO_PIN_THRESHOLD = 10;  // この重要度を超えたら自動ピン（handleTermClickと共通）

    const id = setInterval(() => {
      const current = activeTermsRef.current;
      if (current.length <= MAX_BUBBLES) return;

      const pinned  = pinnedTermIdsRef.current;
      const imp     = termImportance.current;
      const ts      = termTimestamps.current;

      // 最山を山を繰り返す：25件以下になるまで削除ループ
      let terms = [...current];
      const toAutoPin: string[] = [];

      while (terms.length > MAX_BUBBLES) {
        // 非ピンを追加時刻順（古い順）にソート
        const nonPinned = terms
          .filter(t => !pinned.has(t.id))
          .sort((a, b) => (ts[a.id] ?? 0) - (ts[b.id] ?? 0));

        if (nonPinned.length === 0) break; // 全ピンなら削除不可能

        // 最古 OLDEST_BATCH 件をバッチ対象に
        const batch = nonPinned.slice(0, OLDEST_BATCH);

        // 最小重要度を求める
        const minScore = Math.min(...batch.map(t => imp[t.id] ?? 0));

        // 最小重要度のバブルを全消去
        const toDelete = new Set(
          batch.filter(t => (imp[t.id] ?? 0) === minScore).map(t => t.id)
        );
        if (toDelete.size === 0) break;

        // 削除されなかったバッチ内のバブルに重要度を加算
        batch.filter(t => !toDelete.has(t.id)).forEach(t => {
          imp[t.id] = (imp[t.id] ?? 0) + SURVIVAL_BOOST;
          // 閾値超えかつ未自動ピンなら自動ピンをキュー
          if ((imp[t.id] ?? 0) >= AUTO_PIN_THRESHOLD && !autoPinnedSet.current.has(t.id)) {
            toAutoPin.push(t.id);
            autoPinnedSet.current.add(t.id);
          }
        });

        terms = terms.filter(t => !toDelete.has(t.id));
      }

      // 削除が発生した場合のみ state を更新
      if (terms.length !== current.length) {
        setActiveTerms(terms);
      }

      // 自動ピン
      if (toAutoPin.length > 0) {
        setPinnedTermIds(prev => {
          const next = new Set(prev);
          toAutoPin.forEach(id => next.add(id));
          return next;
        });
        toast.success(`⭐ ${toAutoPin.length}件の用語を自動ピン留めしました`);
      }
    }, 3000);

    return () => clearInterval(id);
  }, []); // refs のみ使用するため依存配列は空

  const AUTO_PIN_THRESHOLD = 10; // この重要度を超えたら自動ピン（クリック1回=+2なので5回クリック相当）

  const handleTermClick = useCallback((term: Term) => {
    setSelectedTerm(term);
    // ピン済みのバブルはクリックしても大きさ・重要度が変化しない
    if (pinnedTermIdsRef.current.has(term.id)) return;
    // click count (バブルサイズに使用)
    setTermWeights(prev => ({ ...prev, [term.id]: (prev[term.id] || 0) + 1 }));
    // 重要度スコアに加算（クリック数とは別変数——将来他のシグナルもここに加算できる）
    const newImp = (termImportance.current[term.id] ?? 0) + 2;
    termImportance.current[term.id] = newImp;
    // 閾値到達で即自動ピン（プルーニングループのチェックを待たない）
    if (newImp >= AUTO_PIN_THRESHOLD && !autoPinnedSet.current.has(term.id)) {
      autoPinnedSet.current.add(term.id);
      setPinnedTermIds(prev => new Set([...prev, term.id]));
      toast.success(`⭐ 「${term.word}」を自動ピン留めしました`);
    }
    setSearchHistory(prev => [term, ...prev.filter(t => t.id !== term.id)].slice(0, 50));
  }, []);

  const handleTogglePin = useCallback((termId: string) => {
    setPinnedTermIds(prev => {
      const next = new Set(prev);
      if (next.has(termId)) {
        // ピン解除: weight・importanceをリセット→生成直後と同じ状態に戻す
        next.delete(termId);
        setTermWeights(prev => ({ ...prev, [termId]: 0 }));
        termImportance.current[termId] = 0;
        termTimestamps.current[termId] = Date.now();
      } else {
        next.add(termId);
      }
      return next;
    });
  }, []);

  const toggleListening = () => {
    if (isListening) { stopListening(); toast.info('録音を停止しました'); }
    else { startListening(); toast.success('🎙 録音を開始しました'); }
  };
  const loadDemo = () => { setTranscript(DEMO_TEXT_INSTANT); toast.success('デモテキストを読み込みました'); };
  const clearAll = () => {
    if (isListening) stopListening();
    demoStream.stopStream();
    setTranscript(''); setActiveTerms([]); setTermWeights({});
    setSelectedTerm(null); setCategoryFilter('ALL');
    setPinnedTermIds(new Set());
    termTimestamps.current = {};
    termImportance.current = {};
    autoPinnedSet.current = new Set();
    toast.info('リセットしました');
  };

  const filteredTerms = categoryFilter === 'ALL' ? activeTerms : activeTerms.filter(t => t.category === categoryFilter);

  // パネルコンテンツ（useMemo で過剰な再生成を抑制）
  const panels: Record<PanelId, React.ReactNode> = useMemo(() => ({
    transcription: (
      <TranscriptionView
        transcript={transcript}
        isListening={isListening}
        onToggleListening={toggleListening}
        onClearTranscript={clearAll}
        onTermClick={handleTermClick}
        onTermHover={() => { }}
        pinnedTermIds={pinnedTermIds}
        onTogglePin={handleTogglePin}
        onLoadDemo={loadDemo}
        demoStream={demoStream}
        darkMode={dk}
      />
    ),
    bubbleCloud: (
      <BubbleCloud
        activeTerms={filteredTerms}
        termWeights={termWeights}
        onTermClick={handleTermClick}
        darkMode={dk}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        selectedTermId={selectedTerm?.id}
        pinnedTermIds={pinnedTermIds}
        onTogglePin={handleTogglePin}
      />
    ),
    detail: (
      <TermDetailPanel
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
        onRelatedTermClick={handleTermClick}
        darkMode={dk}
        isPinned={selectedTerm ? pinnedTermIds.has(selectedTerm.id) : false}
        onTogglePin={() => selectedTerm && handleTogglePin(selectedTerm.id)}
      />
    ),
    history: (
      <HistoryPanel
        history={searchHistory}
        onTermClick={handleTermClick}
        onClear={() => { setSearchHistory([]); toast.success('履歴を削除しました'); }}
        darkMode={dk}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [transcript, isListening, filteredTerms, termWeights, selectedTerm, searchHistory, dk, categoryFilter, handleTermClick, pinnedTermIds, handleTogglePin]);

  return (
    <div
      className={`h-full flex flex-col font-sans transition-colors duration-500 ${dk ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {dk && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
        </div>
      )}

      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className={`border-b sticky top-0 z-40 transition-colors ${dk ? 'bg-[#0d0e1a]/90 backdrop-blur-xl border-slate-800/60' : 'bg-white/90 backdrop-blur-xl border-slate-200'}`}>
        <div className="w-full px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Book size={18} />
            </div>
            <span className="text-lg font-black tracking-tight">LexiFlow</span>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] hidden sm:inline">Pro</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* レイアウトプリセットメニュー */}
            <div className="relative">
              <button
                onClick={() => setIsLayoutMenuOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isLayoutMenuOpen ? (dk ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (dk ? 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border-slate-700/50' : 'text-slate-500 hover:text-slate-700 bg-white border-slate-200 hover:bg-slate-50')}`}
              >
                <LayoutGrid size={13} />レイアウト
              </button>
              {isLayoutMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLayoutMenuOpen(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl border shadow-2xl overflow-hidden min-w-[160px] ${dk ? 'bg-[#12132a] border-slate-800/60' : 'bg-white border-slate-200'}`}>
                    {PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => { setLayout(p.make()); setIsLayoutMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${dk ? 'hover:bg-indigo-600/20 text-slate-300 hover:text-white' : 'hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>


            <VectorApiCheckButton darkMode={dk} />
            <button onClick={() => setIsSettingsOpen(true)} className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'}`}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Layout Engine */}
      <div className="relative z-10 flex-1 w-full" style={{ height: 'calc(100vh - 56px)' }}>
        <LayoutEngine
          layout={layout}
          onLayoutChange={setLayout}
          darkMode={dk}
          themeColor={settings.themeColor}
          panels={panels}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={s => setSettings(prev => ({ ...prev, ...s }))}
      />
    </div>
  );
};

export default App;
