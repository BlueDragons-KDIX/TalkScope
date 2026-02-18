import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { TranscriptionView } from './components/TranscriptionView';
import { BubbleCloud } from './components/BubbleCloud';
import { TermDetailModal } from './components/TermDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { Term } from './data/terms';
import { extractTerms } from './utils/termDetection';
import { Settings, Book, LayoutDashboard, User, History, Sparkles, Shield, Zap, GraduationCap, ChevronRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';

interface LevelInfo {
  label: string;
  icon: React.ReactNode;
  desc: string;
}

interface AccentStyle {
  text: string;
  bg: string;
  ring: string;
  glow: string;
  bgSoft: string;
  border: string;
}

const ACCENT_MAP: Record<string, AccentStyle> = {
  blue:    { text: 'text-blue-400',    bg: 'bg-blue-600',    ring: 'ring-blue-500/30',    glow: 'shadow-blue-500/20',    bgSoft: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-600',  ring: 'ring-indigo-500/30',  glow: 'shadow-indigo-500/20',  bgSoft: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
  purple:  { text: 'text-purple-400',  bg: 'bg-purple-600',  ring: 'ring-purple-500/30',  glow: 'shadow-purple-500/20',  bgSoft: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  rose:    { text: 'text-rose-400',    bg: 'bg-rose-600',    ring: 'ring-rose-500/30',    glow: 'shadow-rose-500/20',    bgSoft: 'bg-rose-500/10',    border: 'border-rose-500/20' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-600', ring: 'ring-emerald-500/30', glow: 'shadow-emerald-500/20', bgSoft: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  orange:  { text: 'text-orange-400',  bg: 'bg-orange-600',  ring: 'ring-orange-500/30',  glow: 'shadow-orange-500/20',  bgSoft: 'bg-orange-500/10',  border: 'border-orange-500/20' },
};

function getLevelInfo(level: number): LevelInfo {
  switch (level) {
    case 0: return { label: 'おまかせ', icon: <Sparkles size={12} />, desc: 'AIが理解度に応じて用語を自動強調' };
    case 1: return { label: '初級', icon: <GraduationCap size={12} />, desc: '基本的なIT用語から解説します' };
    case 2: return { label: '中級', icon: <Zap size={12} />, desc: '実務で使われる用語を中心に表示' };
    case 3: return { label: '上級', icon: <Shield size={12} />, desc: 'アーキテクチャ・設計レベルの用語を優先表示' };
    default: return { label: '上級', icon: <Shield size={12} />, desc: 'アーキテクチャ・設計レベルの用語を優先表示' };
  }
}

const LEVELS = [
  { val: 0, label: 'おまかせ' },
  { val: 1, label: '初級' },
  { val: 2, label: '中級' },
  { val: 3, label: '上級' },
];

const App: React.FC = () => {
  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    error 
  } = useSpeechRecognition();

  const [activeTerms, setActiveTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [termWeights, setTermWeights] = useState<Record<string, number>>({});
  const [userLevel, setUserLevel] = useState<number>(3);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Term[]>([]);
  const [settings, setSettings] = useState({
    darkMode: true,
    themeColor: 'indigo',
    sensitivity: 50,
    autoLevel: false
  });

  const dk = settings.darkMode;
  const accent = ACCENT_MAP[settings.themeColor] || ACCENT_MAP.indigo;
  const levelInfo = getLevelInfo(userLevel);

  useEffect(() => {
    if (dk) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dk]);

  useEffect(() => {
    if (settings.autoLevel) {
      setUserLevel(0);
    } else if (userLevel === 0) {
      setUserLevel(1);
    }
  }, [settings.autoLevel, userLevel]);

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

  const handleTermClick = (term: Term) => {
    setSelectedTerm(term);
    setTermWeights(prev => ({
      ...prev,
      [term.id]: (prev[term.id] || 0) + 1
    }));
    setSearchHistory(prev => {
      const filtered = prev.filter(t => t.id !== term.id);
      return [term, ...filtered].slice(0, 50);
    });
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      toast.info('マイクの使用を開始しました。');
    }
  };

  const getLevelButtonClass = (val: number) => {
    const isActive = userLevel === val;
    if (isActive) {
      if (dk) {
        return `bg-slate-700/80 ${accent.text} ring-1 ${accent.ring}`;
      }
      return `bg-white ${accent.text} shadow-sm`;
    }
    if (dk) return 'text-slate-500 hover:text-slate-300';
    return 'text-slate-400 hover:text-slate-600';
  };

  const getLevelIcon = (val: number) => {
    if (val === 0) return <Sparkles size={12} />;
    if (val === 1) return <GraduationCap size={12} />;
    if (val === 2) return <Zap size={12} />;
    return <Shield size={12} />;
  };

  const badgeClass = dk
    ? `${accent.bgSoft} ${accent.text} border ${accent.border}`
    : 'bg-indigo-50 text-indigo-600 border border-indigo-100';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans ${dk ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {dk && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
        </div>
      )}

      <Toaster position="top-center" richColors />
      
      <header className={`border-b sticky top-0 z-40 transition-colors ${dk ? 'bg-[#0d0e1a]/80 backdrop-blur-xl border-slate-800/60' : 'bg-white/80 backdrop-blur-xl border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${accent.bg} p-1.5 rounded-lg text-white shadow-lg`}>
              <Book size={18} />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-black tracking-tight">LexiFlow</h1>
              <span className={`text-[9px] font-bold ${accent.text} uppercase tracking-[0.2em] hidden sm:inline opacity-80`}>
                Pro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <div className={`hidden lg:flex items-center p-0.5 rounded-lg gap-0.5 ${dk ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-100'}`}>
              {LEVELS.map((level) => (
                <button
                  key={level.val}
                  onClick={() => {
                    setUserLevel(level.val);
                    setSettings(s => ({ ...s, autoLevel: level.val === 0 }));
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${getLevelButtonClass(level.val)}`}
                >
                  {getLevelIcon(level.val)}
                  {level.label}
                </button>
              ))}
            </div>

            <div className={`flex items-center gap-0.5 border-l pl-1.5 md:pl-3 ml-1 ${dk ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'}`}
                title="履歴"
              >
                <History size={18} />
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'}`}
                title="設定"
              >
                <Settings size={18} />
              </button>
            </div>
            
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer ${dk ? 'bg-slate-800 border border-slate-700/50' : 'bg-slate-200'}`}>
              <User size={14} className={dk ? 'text-slate-500' : 'text-slate-400'} />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold ${badgeClass}`}>
                {levelInfo.icon}
                <span>{levelInfo.label}モード</span>
              </div>
              <div className={`w-1 h-1 rounded-full ${dk ? 'bg-slate-600' : 'bg-slate-300'}`} />
              <span className={`text-[10px] font-medium ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{levelInfo.desc}</span>
            </div>
            <h2 className="text-2xl font-black mb-1">
              リアルタイム用語解析
            </h2>
            <p className={`max-w-xl font-medium text-sm ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              音声をリアルタイムで文字起こしし、専門用語を自動検出・解説します。
            </p>
          </div>
          <div className="flex gap-2">
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${dk ? 'bg-[#0d0e1a] border-slate-800/80' : 'bg-white border-slate-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : dk ? 'bg-slate-600' : 'bg-slate-300'}`} />
              <span className={`text-[11px] font-bold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                {isListening ? 'LIVE' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          <div className="flex flex-col h-full">
            <TranscriptionView
              transcript={transcript}
              isListening={isListening}
              onToggleListening={toggleListening}
              onTermClick={handleTermClick}
              onTermHover={() => {}} 
              darkMode={dk}
              themeColor={settings.themeColor}
            />
          </div>

          <div className="flex flex-col h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={14} className={dk ? 'text-slate-600' : 'text-slate-300'} />
                <h3 className={`text-sm font-bold ${dk ? 'text-slate-300' : 'text-slate-700'}`}>用語マップ</h3>
              </div>
              <div className={`text-[10px] border px-2 py-0.5 rounded font-mono font-bold ${dk ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                {activeTerms.length} terms
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <BubbleCloud
                activeTerms={activeTerms}
                termWeights={termWeights}
                onTermClick={handleTermClick}
                userLevel={userLevel === 0 ? 1 : userLevel}
                darkMode={dk}
              />
            </div>

            <div className={`mt-3 p-3 border rounded-xl flex items-center justify-between ${dk ? 'bg-slate-900/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${dk ? accent.bgSoft : 'bg-indigo-50'}`}>
                  {levelInfo.icon}
                </div>
                <span className={`text-[11px] font-medium ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  {levelInfo.desc}
                </span>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`text-[10px] font-bold flex items-center gap-0.5 hover:opacity-80 transition-opacity ${accent.text}`}
              >
                変更
                <ChevronRight size={10} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <TermDetailModal
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
        onRelatedTermClick={(term) => {
          setSelectedTerm(term);
          setTermWeights(prev => ({
            ...prev,
            [term.id]: (prev[term.id] || 0) + 1
          }));
        }}
        darkMode={dk}
        themeColor={settings.themeColor}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={(newSettings) => setSettings(s => ({ ...s, ...newSettings }))}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={searchHistory}
        onTermClick={(term) => {
          handleTermClick(term);
          setIsHistoryOpen(false);
        }}
        onClearHistory={() => {
          setSearchHistory([]);
          toast.success('履歴を削除しました');
        }}
        darkMode={dk}
        themeColor={settings.themeColor}
      />
    </div>
  );
};

export default App;
