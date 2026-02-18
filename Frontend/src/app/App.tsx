import React, { useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { TranscriptionView } from './components/TranscriptionView';
import { BubbleCloud } from './components/BubbleCloud';
import { TermDetailPanel } from './components/TermDetailPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Term } from './data/terms';
import { extractTerms } from './utils/termDetection';
import { Settings, Book, Shield, Zap, GraduationCap, RotateCcw, Play, Info, History } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { Toaster, toast } from 'sonner';

const DEMO_TEXT = `本日はReactとTypeScriptを使ったフロントエンド開発について話します。バックエンドにはAPIを通じてデータを取得し、DockerでコンテナとしてAWS上にデプロイします。CI/CDパイプラインを整備することで、GitHubへのプッシュをトリガーに自動的にビルドとテストが走る仕組みになっています。データベースにはSQLとNoSQLを用途に応じて使い分けており、LLMを活用した機能も今後追加予定です。`;


const LEVELS = [
  { val: 1, label: '初級', icon: <GraduationCap size={12} /> },
  { val: 2, label: '中級', icon: <Zap size={12} /> },
  { val: 3, label: '上級', icon: <Shield size={12} /> },
];

const App: React.FC = () => {
  const {
    transcript,
    setTranscript,
    isListening,
    startListening,
    stopListening,
    error
  } = useSpeechRecognition();

  const [activeTerms, setActiveTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [termWeights, setTermWeights] = useState<Record<string, number>>({});
  const [userLevel, setUserLevel] = useState<number>(2);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [rightPanel, setRightPanel] = useState<'detail' | 'history'>('detail');
  const [searchHistory, setSearchHistory] = useState<Term[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    darkMode: true,
    themeColor: 'indigo',
    sensitivity: 50,
    autoLevel: false
  });

  const dk = settings.darkMode;

  useEffect(() => {
    if (dk) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dk]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (transcript) {
      const extracted = extractTerms(transcript);
      setActiveTerms(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTerms = extracted.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTerms];
      });
    }
  }, [transcript]);

  const handleTermClick = useCallback((term: Term) => {
    setSelectedTerm(term);
    setTermWeights(prev => ({
      ...prev,
      [term.id]: (prev[term.id] || 0) + 1
    }));
    setSearchHistory(prev => {
      const filtered = prev.filter(t => t.id !== term.id);
      return [term, ...filtered].slice(0, 50);
    });
    setRightPanel('detail');
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      toast.info('録音を停止しました');
    } else {
      startListening();
      toast.success('🎙 録音を開始しました');
    }
  };

  const loadDemo = () => {
    setTranscript(DEMO_TEXT);
    toast.success('デモテキストを読み込みました');
  };

  const clearAll = () => {
    if (isListening) stopListening();
    setTranscript('');
    setActiveTerms([]);
    setTermWeights({});
    setSelectedTerm(null);
    setCategoryFilter('ALL');
    toast.info('リセットしました');
  };

  const filteredTerms = categoryFilter === 'ALL'
    ? activeTerms
    : activeTerms.filter(t => t.category === categoryFilter);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${dk ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}
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
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Book size={18} />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight">LexiFlow</span>
              <span className="ml-2 text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] hidden sm:inline">Pro</span>
            </div>
          </div>

          {/* Level Selector */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
            <span className={`text-[10px] font-bold px-2 hidden sm:inline ${dk ? 'text-slate-600' : 'text-slate-400'}`}>レベル</span>
            {LEVELS.map(l => (
              <button
                key={l.val}
                onClick={() => setUserLevel(l.val)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  userLevel === l.val
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {l.icon}{l.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={loadDemo}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${dk ? 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border-slate-700/50' : 'text-slate-500 hover:text-slate-700 bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <Play size={11} />デモ
            </button>
            <button
              onClick={clearAll}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${dk ? 'text-slate-400 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 border-slate-700/50 hover:border-red-500/30' : 'text-slate-500 hover:text-red-500 bg-white border-slate-200 hover:bg-red-50'}`}
            >
              <RotateCcw size={11} />リセット
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="relative z-10 flex-1 flex max-w-[1400px] mx-auto w-full" style={{ height: 'calc(100vh - 56px)' }}>

        {/* LEFT: Transcription (40%) */}
        <div className={`flex flex-col border-r ${dk ? 'border-slate-800/60' : 'border-slate-200'}`} style={{ width: '40%', minWidth: 280 }}>
          <TranscriptionView
            transcript={transcript}
            isListening={isListening}
            onToggleListening={toggleListening}
            onTermClick={handleTermClick}
            onTermHover={() => {}}
            onLoadDemo={loadDemo}
            darkMode={dk}
          />
        </div>

        {/* CENTER: Bubble cloud (35%) */}
        <div className={`flex flex-col border-r ${dk ? 'border-slate-800/60' : 'border-slate-200'}`} style={{ width: '35%' }}>
          <BubbleCloud
            activeTerms={filteredTerms}
            termWeights={termWeights}
            onTermClick={handleTermClick}
            userLevel={userLevel}
            darkMode={dk}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            selectedTermId={selectedTerm?.id}
          />
        </div>

        {/* RIGHT: Detail / History panel (25%) */}
        <div className="flex flex-col" style={{ width: '25%', minWidth: 220 }}>
          {/* Tab switcher */}
          <div className={`border-b flex flex-shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/20' : 'border-slate-200 bg-slate-50/80'}`}>
            {[
              { key: 'detail' as const, label: '詳細', icon: <Info size={12} /> },
              { key: 'history' as const, label: '履歴', icon: <History size={12} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setRightPanel(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2 ${
                  rightPanel === tab.key
                    ? 'border-indigo-500 text-indigo-400'
                    : `border-transparent ${dk ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`
                }`}
              >
                {tab.icon}{tab.label}
                {tab.key === 'history' && searchHistory.length > 0 && (
                  <span className="text-[9px] bg-indigo-600/60 text-indigo-200 rounded-full px-1.5">{searchHistory.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'detail'
              ? <TermDetailPanel
                  term={selectedTerm}
                  onClose={() => setSelectedTerm(null)}
                  onRelatedTermClick={t => handleTermClick(t)}
                  darkMode={dk}
                />
              : <HistoryPanel
                  history={searchHistory}
                  onTermClick={(t: Term) => { handleTermClick(t); setRightPanel('detail'); }}
                  onClear={() => {
                    setSearchHistory([]);
                    toast.success('履歴を削除しました');
                  }}
                  darkMode={dk}
                />
            }
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={(newSettings) => setSettings(s => ({ ...s, ...newSettings }))}
      />
    </div>
  );
};

export default App;
