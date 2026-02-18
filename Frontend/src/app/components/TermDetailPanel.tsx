import React from 'react';
import { Term, IT_TERMS } from '../data/terms';
import { X, ExternalLink, Hash, BookOpen, Layers } from 'lucide-react';

interface TermDetailPanelProps {
  term: Term | null;
  onClose: () => void;
  onRelatedTermClick: (term: Term) => void;
  darkMode?: boolean;
}

export const TermDetailPanel: React.FC<TermDetailPanelProps> = ({ term, onClose, onRelatedTermClick, darkMode = true }) => {
  const dk = darkMode;

  if (!term) {
    return (
      <div className={`h-full flex flex-col items-center justify-center text-center p-8 ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
        <BookOpen size={40} className="mb-4 opacity-30" />
        <p className="text-sm font-bold opacity-50">用語をクリックすると<br />詳細が表示されます</p>
      </div>
    );
  }

  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1: return { text: '初級', color: dk ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-green-100 text-green-700' };
      case 2: return { text: '中級', color: dk ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700' };
      case 3: return { text: '上級', color: dk ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700' };
      default: return { text: '不明', color: dk ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : 'bg-slate-100 text-slate-700' };
    }
  };

  const levelInfo = getLevelInfo(term.level);
  const related = term.relatedTerms.map(w => IT_TERMS.find(t => t.word === w)).filter(Boolean) as Term[];

  return (
    <div className={`h-full flex flex-col overflow-hidden ${dk ? 'bg-[#0d0e1a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`p-5 border-b flex-shrink-0 ${dk ? 'border-slate-800/60' : 'border-slate-100'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${levelInfo.color}`}>
                {levelInfo.text}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dk ? 'bg-slate-800 text-slate-400 border border-slate-700/50' : 'bg-slate-100 text-slate-500'}`}>
                {term.category}
              </span>
            </div>
            <h2 className="text-2xl font-black">{term.word}</h2>
            <p className={`text-sm mt-0.5 ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{term.kana}</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-600 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'}`}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <section>
          <div className={`flex items-center gap-1.5 mb-2 text-xs font-bold ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>
            <BookOpen size={13} /><span>説明</span>
          </div>
          <p className={`text-sm leading-relaxed ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{term.longDesc}</p>
        </section>

        {related.length > 0 && (
          <section>
            <div className={`flex items-center gap-1.5 mb-2 text-xs font-bold ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>
              <Layers size={13} /><span>関連ワード</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {related.map(r => (
                <button
                  key={r.id}
                  onClick={() => onRelatedTermClick(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${dk ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                >
                  <Hash size={9} />{r.word}
                </button>
              ))}
              {term.relatedTerms.filter(w => !IT_TERMS.find(t => t.word === w)).map(w => (
                <span key={w} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${dk ? 'border-slate-700 bg-slate-800/50 text-slate-500' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                  #{w}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t flex gap-2 flex-shrink-0 ${dk ? 'border-slate-800/60' : 'border-slate-100'}`}>
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(term.word + ' IT用語 意味')}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-colors ${dk ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700/50' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}
        >
          Google検索<ExternalLink size={11} />
        </a>
        {term.externalUrl && (
          <a
            href={term.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            公式サイト<ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
};
