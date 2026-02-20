import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDemoStream } from './hooks/useDemoStream';
import { DEMO_TEXT_INSTANT } from './demo/demo';
import { TranscriptionView } from './components/TranscriptionView';
import { BubbleCloud } from './components/BubbleCloud';
import { TermDetailPanel } from './components/TermDetailPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Term } from './data/terms';
import { extractTerms } from './utils/termDetection';
import { Book, LayoutGrid, Settings } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
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
  // 低興味バブルの半透明フィードバック用
  const [lowInterestIds, setLowInterestIds] = useState<Set<string>>(new Set());

  // ── バブル寿命管理 refs ────────────────────────────────────────
  // termId → 追加時刻 (ms)
  const termTimestamps = useRef<Record<string, number>>({});
  // termId → 最後にクリックされた時刻 (ms)
  const termClickTimestamps = useRef<Record<string, number>>({});

  // ── デモ機能（コア機能から独立） ──────────────────────────────
  const demoStream = useDemoStream({
    onAppend: (text) => setTranscript(text),
    intervalMs: 220,
  });
  // ──────────────────────────────────────────────────────────────

  const dk = settings.darkMode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dk);
  }, [dk]);

  useEffect(() => { if (error) toast.error(error); }, [error]);

  useEffect(() => {
    if (!transcript) return;
    const extracted = extractTerms(transcript);
    const now = Date.now();
    setActiveTerms(prev => {
      const ids = new Set(prev.map(t => t.id));
      const newTerms = extracted.filter(t => !ids.has(t.id));
      // 新出バブル: 追加時刻を記録
      newTerms.forEach(t => { termTimestamps.current[t.id] = now; });
      // 再出現バブル: タイムスタンプをリセットして猶予期間を延命
      extracted.filter(t => ids.has(t.id)).forEach(t => {
        termTimestamps.current[t.id] = now;
      });
      return [...prev, ...newTerms];
    });
  }, [transcript]);

  // ── スマートバブル削除 (2秒ごとにスキャン) ────────────────────
  useEffect(() => {
    const GRACE_MS      = 20_000; // 新出バブルの猶予期間
    const HALF_LIFE_MS  = 5 * 60 * 1000; // 興味スコアの半減期（5分）
    const SOFT_LIMIT    = 12;    // この数を超えたら低スコア順に削除
    const HARD_LIMIT    = 20;    // この数を超えたら猶予なしで即削除
    // 興味スコア: クリック回数 × 時間減衰
    const interestScore = (termId: string, clicks: number) => {
      const lastClick = termClickTimestamps.current[termId]
        ?? termTimestamps.current[termId]
        ?? 0;
      const elapsed = Date.now() - lastClick;
      return clicks * Math.exp(-elapsed / HALF_LIFE_MS);
    };

    const id = setInterval(() => {
      const now = Date.now();
      setActiveTerms(prev => {
        if (prev.length <= SOFT_LIMIT) {
          setLowInterestIds(new Set());
          return prev;
        }
        // 削除候補: ピン済み・猶予期間中を除く
        const candidates = prev.filter(t =>
          !pinnedTermIds.has(t.id) &&
          now - (termTimestamps.current[t.id] ?? 0) > GRACE_MS
        );
        // スコア昇順（低スコアが先頭）
        const sorted = [...candidates].sort((a, b) =>
          interestScore(a.id, termWeightsRef.current[a.id] || 0) -
          interestScore(b.id, termWeightsRef.current[b.id] || 0)
        );
        // ハード上限超過: 猶予なしで即削除（ピン除く）
        if (prev.length > HARD_LIMIT) {
          const removeCount = prev.length - SOFT_LIMIT;
          const toRemove = new Set(sorted.slice(0, removeCount).map(t => t.id));
          setLowInterestIds(new Set());
          return prev.filter(t => !toRemove.has(t.id));
        }
        // ソフト上限超過: 最低スコア1件だけ除去
        const toRemove = new Set([sorted[0]?.id].filter(Boolean));
        // 次に消えそうなバブル（上位3件）を半透明フィードバック
        const fadingIds = new Set(sorted.slice(0, 3).map(t => t.id));
        setLowInterestIds(fadingIds);
        return prev.filter(t => !toRemove.has(t.id));
      });
    }, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedTermIds]);

  // termWeights を setInterval クロージャから参照するための ref
  const termWeightsRef = useRef<Record<string, number>>({});

  const handleTermClick = useCallback((term: Term) => {
    setSelectedTerm(term);
    setTermWeights(prev => {
      const next = { ...prev, [term.id]: (prev[term.id] || 0) + 1 };
      termWeightsRef.current = next; // ref にも同期
      return next;
    });
    // クリック時刻を記録（時間減衰スコアの基準点）
    termClickTimestamps.current[term.id] = Date.now();
    setSearchHistory(prev => [term, ...prev.filter(t => t.id !== term.id)].slice(0, 50));
  }, []);

  const handleTogglePin = useCallback((termId: string) => {
    setPinnedTermIds(prev => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
        // ピン解除時はタイムスタンプをリセット（今から30秒後に消える）
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
    setLowInterestIds(new Set());
    termTimestamps.current = {};
    termClickTimestamps.current = {};
    termWeightsRef.current = {};
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
        lowInterestIds={lowInterestIds}
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
  }), [transcript, isListening, filteredTerms, termWeights, selectedTerm, searchHistory, dk, categoryFilter, handleTermClick, pinnedTermIds, handleTogglePin, lowInterestIds]);

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
