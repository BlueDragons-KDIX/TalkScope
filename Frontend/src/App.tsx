import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSpeechRecognition } from '@/application/hooks/useSpeechRecognition';
import { useDemoStream } from '@/application/hooks/useDemoStream';
import { useVectorSend } from '@/application/hooks/useVectorSend';
import { useReferDict, type DictTermResult } from '@/application/hooks/useReferDict';
import type { VectorPayload } from '@/infrastructure/api/vectorSendWithOverlap';
import { DEMO_TEXT_INSTANT } from '@/shared/utils/demo';
import { TranscriptionView } from '@/presentation/widgets/TranscriptionView';
import { BubbleCloud } from '@/presentation/widgets/BubbleCloud';
import { TermDetailPanel } from '@/presentation/widgets/TermDetailPanel';
import { HistoryPanel } from '@/presentation/widgets/HistoryPanel';
import { DictionaryManagerModal } from '@/presentation/components/DictionaryManagerModal';
import { Term } from '@/domain/models/terms';
import { Book, LayoutGrid, LibraryBig, Settings, Target } from 'lucide-react';
import { SettingsModal } from '@/presentation/components/SettingsModal';
import { Toaster, toast } from 'sonner';
import { LayoutEngine } from '@/presentation/layouts/LayoutEngine';
import { PanelId } from '@/domain/models/layoutTypes';
import {
  makeDefaultLayout,
  make2x2Layout,
  makeHorizontalLayout,
  makeVerticalLayout,
  makeLeftRightLayout,
} from '@/presentation/layouts/layoutUtils';

// カスタムフックをインポート
import { useWorkspaceLayout } from '@/application/hooks/useWorkspaceLayout';
import { useSessionTerms } from '@/application/hooks/useSessionTerms';
import { useTermVectors } from '@/application/hooks/useTermVectors';

// レイアウトプリセット定義
const PRESETS = [
  { key: 'default', label: 'デフォルト', make: makeDefaultLayout },
  { key: 'leftRight', label: '左右+縦分割', make: makeLeftRightLayout },
  { key: '2x2', label: '2×2', make: make2x2Layout },
  { key: 'horizontal', label: '横4列', make: makeHorizontalLayout },
  { key: 'vertical', label: '縦4列', make: makeVerticalLayout },
] as const;

const App: React.FC = () => {
  if (import.meta.env.DEV) console.log('[TalkScope] App.tsx 読み込み（主題入力あり）');
  const { transcript, setTranscript, isListening, startListening, stopListening, error } = useSpeechRecognition();

  // API用の内部状態
  const [apiTerms, setApiTerms] = useState<Term[]>([]);
  const [termVectors, setTermVectors] = useState<Record<string, number[]>>({});

  // レイアウト関連フック
  const {
    layout, setLayout,
    isLayoutMenuOpen, setIsLayoutMenuOpen,
    isSettingsOpen, setIsSettingsOpen,
    isDictionaryManagerOpen, setIsDictionaryManagerOpen,
    settings, setSettings,
    closePanel
  } = useWorkspaceLayout();

  // セッションの用語ライフサイクルとピン留め管理フック
  const {
    activeTerms,
    selectedTerm, setSelectedTerm,
    termWeights,
    searchHistory, setSearchHistory,
    isPinned,
    pinnedTermsList,
    categoryFilter, setCategoryFilter,
    handleTermClick,
    handleTogglePin,
    clearTermsAndHistory,
    termFrequencies,
  } = useSessionTerms(transcript, apiTerms);

  // ベクトルと類似度判定のフック
  const {
    themeText, setThemeText,
    themeVector,
    isSimilarityFilterEnabled, setIsSimilarityFilterEnabled,
    similarityFilterStrength, setSimilarityFilterStrength,
    isItReferenceReady,
    termSimilarities,
    similarityThreshold,
    itReferenceVector,
    clearVectors
  } = useTermVectors(activeTerms, termVectors);

  // ── デモ機能 ──
  const demoStream = useDemoStream({
    onAppend: (text) => setTranscript(text),
  });

  useVectorSend(transcript, {
    baseUrl: (import.meta.env.VITE_BACKEND_URL ?? '').trim() || (import.meta.env.VITE_VECTOR_API_URL ?? '').trim(),
    overlapSentences: Number(import.meta.env.VITE_VECTOR_OVERLAP_SENTENCES) || 5,
    sendEveryNSentences: Number(import.meta.env.VITE_VECTOR_SEND_EVERY_N_SENTENCES) || 5,
    intervalSec: Number(import.meta.env.VITE_VECTOR_SEND_INTERVAL_SEC) || 0,
    onSent: (payload: VectorPayload, result?: unknown) => {
      if (import.meta.env.DEV) console.log('[vector] payload', payload.sentences.length, result);
    },
    onError: (err: unknown) => console.warn('[vector] send error', err),
  });

  // ── refer_dictionary API ──
  const handleDictResults = useCallback((results: DictTermResult[]) => {
    const newTerms: Term[] = [];
    const newVectors: Record<string, number[]> = {};
    for (const r of results) {
      newTerms.push(r.term);
      if (r.meaningVector && r.meaningVector.length > 0) {
        newVectors[r.term.id] = r.meaningVector;
      }
    }
    if (newTerms.length > 0) {
      setApiTerms(prev => [...prev, ...newTerms]);
      setTermVectors(prev => ({ ...prev, ...newVectors }));
    }
  }, []);

  useReferDict(transcript, {
    baseUrl: (import.meta.env.VITE_BACKEND_URL ?? '').trim(),
    intervalSec: 5,
    trailingDebounceMs: 1000,
    onResults: handleDictResults,
    onError: (err: unknown) => console.warn('[referDict] send error', err),
  });

  const dk = settings.darkMode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dk);
  }, [dk]);

  useEffect(() => { if (error) toast.error(error); }, [error]);

  const toggleListening = () => {
    if (isListening) { stopListening(); toast.info('録音を停止しました'); }
    else { startListening(); toast.success('🎙 録音を開始しました'); }
  };
  
  const loadDemo = () => { setTranscript(DEMO_TEXT_INSTANT); toast.success('デモテキストを読み込みました'); };
  
  const clearAll = () => {
    if (isListening) stopListening();
    demoStream.stopStream();
    setTranscript('');
    setApiTerms([]);
    setTermVectors({});
    clearTermsAndHistory();
    clearVectors();
    toast.info('リセットしました');
  };

  // フィルタリング処理
  const categoryFilteredTerms =
    categoryFilter === 'ALL'
      ? activeTerms
      : categoryFilter === 'ピン中'
        ? pinnedTermsList
        : activeTerms.filter(t => t.category === categoryFilter);
        
  const filteredTerms =
    isSimilarityFilterEnabled && categoryFilter !== 'ピン中' && itReferenceVector?.length
      ? categoryFilteredTerms.filter((term) => (termSimilarities[term.id] ?? -1) >= similarityThreshold)
      : categoryFilteredTerms;

  // パネルコンテンツ
  const panels: Record<PanelId, React.ReactNode> = useMemo(() => ({
    transcription: (
      <TranscriptionView
        transcript={transcript}
        isListening={isListening}
        onToggleListening={toggleListening}
        onClearTranscript={clearAll}
        onTermClick={handleTermClick}
        onTermHover={() => { }}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onLoadDemo={loadDemo}
        demoStream={demoStream}
        darkMode={dk}
        apiTerms={apiTerms}
      />
    ),
    bubbleCloud: (
      <BubbleCloud
        activeTerms={filteredTerms}
        termWeights={termWeights}
        termFrequencies={termFrequencies}
        onTermClick={handleTermClick}
        darkMode={dk}
        selectedTermId={selectedTerm?.id}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        themeVector={themeVector}
        themeText={themeText}
        termVectors={termVectors}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />
    ),
    detail: (
      <TermDetailPanel
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
        onRelatedTermClick={handleTermClick}
        darkMode={dk}
        isPinned={selectedTerm ? isPinned.has(selectedTerm.id) : false}
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
  }), [transcript, isListening, filteredTerms, termWeights, termFrequencies, selectedTerm, searchHistory, dk, categoryFilter, handleTermClick, isPinned, handleTogglePin, themeVector, themeText, termVectors, apiTerms]);

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
        <div className="w-full min-w-0 px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Book size={18} />
            </div>
            <span className="text-lg font-black tracking-tight">TalkScope</span>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] hidden sm:inline">Pro</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* 主題入力 */}
            <label
              id="lexiflow-theme-input"
              className={`flex items-center overflow-hidden rounded-lg border shrink-0 py-2 transition-[width] duration-200 ease-out w-9 hover:w-64 focus-within:w-60 ${dk ? 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700/60' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
            >
              <span className="flex shrink-0 items-center justify-center w-9 h-6">
                <Target size={12} className={dk ? 'text-slate-600' : 'text-slate-400'} aria-hidden />
              </span>
              <input
                type="text"
                value={themeText}
                onChange={(e) => setThemeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="ハイライトしたいキーワードを入力"
                className={`bg-transparent border-none outline-none text-xs flex-1 min-w-0 px-0 py-0 ${dk ? 'text-slate-300 placeholder-slate-600' : 'text-slate-600 placeholder-slate-400'}`}
                aria-label="主題"
              />
            </label>
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

            <button
              onClick={() => setIsDictionaryManagerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                dk
                  ? 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border-slate-700/50'
                  : 'text-slate-500 hover:text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <LibraryBig size={13} />
              単語管理
            </button>

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
          onClose={closePanel}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={s => setSettings(prev => ({ ...prev, ...s }))}
        similarityFilterEnabled={isSimilarityFilterEnabled}
        onSimilarityFilterEnabledChange={setIsSimilarityFilterEnabled}
        similarityFilterStrength={similarityFilterStrength}
        onSimilarityFilterStrengthChange={setSimilarityFilterStrength}
        similarityReferenceWord="IT"
        similarityReady={isItReferenceReady}
      />

      <DictionaryManagerModal
        isOpen={isDictionaryManagerOpen}
        onClose={() => setIsDictionaryManagerOpen(false)}
        darkMode={dk}
      />
    </div>
  );
};

export default App;
