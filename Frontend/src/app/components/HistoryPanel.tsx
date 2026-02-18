import React, { useState } from 'react';
import { Term } from '../data/terms';
import { History, Trash2, ChevronRight, Search } from 'lucide-react';

const CATEGORY_DOT: Record<string, string> = {
  Frontend: '#60a5fa',
  Backend:  '#34d399',
  Infra:    '#a78bfa',
  'AI/Data':'#fbbf24',
  General:  '#94a3b8',
};

interface HistoryPanelProps {
  history: Term[];
  onTermClick: (term: Term) => void;
  onClear: () => void;
  darkMode?: boolean;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onTermClick, onClear, darkMode = true }) => {
  const [search, setSearch] = useState('');
  const dk = darkMode;

  const filtered = history.filter(t =>
    t.word.toLowerCase().includes(search.toLowerCase()) ||
    t.shortDesc.includes(search)
  );

  return (
    <div className={`h-full flex flex-col ${dk ? 'bg-[#0d0e1a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex-shrink-0 ${dk ? 'border-slate-800/60' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History size={14} className="text-indigo-400" />
            <span className="text-sm font-black">検索履歴</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={onClear}
              className={`p-1.5 rounded-lg transition-colors text-[11px] font-bold flex items-center gap-1 ${dk ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
            >
              <Trash2 size={12} />クリア
            </button>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${dk ? 'bg-slate-900/50 border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}>
          <Search size={12} className={dk ? 'text-slate-600' : 'text-slate-400'} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="履歴から検索..."
            className={`bg-transparent border-none outline-none text-xs flex-1 ${dk ? 'text-slate-300 placeholder-slate-600' : 'text-slate-600 placeholder-slate-400'}`}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center text-center ${dk ? 'text-slate-700' : 'text-slate-300'}`}>
            <History size={28} className="mb-3 opacity-40" />
            <p className="text-xs font-bold opacity-50">{history.length === 0 ? '履歴はまだありません' : '該当なし'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((t, i) => (
              <button
                key={`${t.id}-${i}`}
                onClick={() => onTermClick(t)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border ${dk ? 'border-transparent hover:bg-slate-800/60 hover:border-indigo-500/20' : 'border-transparent hover:bg-slate-50 hover:border-indigo-200'}`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_DOT[t.category] || '#94a3b8' }}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black truncate ${dk ? 'text-slate-200' : 'text-slate-700'}`}>{t.word}</p>
                  <p className={`text-[10px] truncate ${dk ? 'text-slate-600' : 'text-slate-400'}`}>{t.shortDesc}</p>
                </div>
                <ChevronRight size={12} className={dk ? 'text-slate-700 flex-shrink-0' : 'text-slate-300 flex-shrink-0'} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
