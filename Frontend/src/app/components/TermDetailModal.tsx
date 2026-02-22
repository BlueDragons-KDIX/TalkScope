import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Term, IT_TERMS } from '../data/terms';
import { X, ExternalLink, Hash, BookOpen, Layers, Copy } from 'lucide-react';

interface TermDetailModalProps {
  term: Term | null;
  onClose: () => void;
  onRelatedTermClick: (term: Term) => void;
  darkMode?: boolean;
}

export const TermDetailModal: React.FC<TermDetailModalProps> = ({ term, onClose, onRelatedTermClick, darkMode = true }) => {
  const [copied, setCopied] = useState<'word' | 'desc' | null>(null);

  const copyWord = useCallback(() => {
    if (!term) return;
    navigator.clipboard.writeText(term.word).then(() => {
      setCopied('word');
      setTimeout(() => setCopied(null), 1500);
    });
  }, [term?.word]);

  const copyDesc = useCallback(() => {
    if (!term) return;
    navigator.clipboard.writeText(term.longDesc).then(() => {
      setCopied('desc');
      setTimeout(() => setCopied(null), 1500);
    });
  }, [term?.longDesc]);
  if (!term) return null;

  const dk = darkMode;

  const getLevelLabel = (level: number) => {
    switch(level) {
      case 1: return { text: "初級", color: dk ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-green-100 text-green-700" };
      case 2: return { text: "中級", color: dk ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-amber-100 text-amber-700" };
      case 3: return { text: "上級", color: dk ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-red-100 text-red-700" };
      default: return { text: "不明", color: dk ? "bg-slate-500/15 text-slate-400 border border-slate-500/20" : "bg-slate-100 text-slate-700" };
    }
  };

  const levelInfo = getLevelLabel(term.level);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 ${dk ? 'bg-black/60' : 'bg-slate-900/50'} backdrop-blur-sm`}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${dk ? 'bg-[#12132a] border-slate-800/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${levelInfo.color}`}>
                    {levelInfo.text}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dk ? 'bg-slate-800 text-slate-400 border border-slate-700/50' : 'bg-slate-100 text-slate-500'}`}>
                    {term.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black">{term.word}</h2>
                  <button
                    onClick={copyWord}
                    title="単語をコピー"
                    className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                  >
                    <Copy size={14} />
                  </button>
                  {copied === 'word' && <span className="text-[10px] font-bold text-emerald-500">コピーしました</span>}
                </div>
                <p className={`text-sm font-medium ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{term.kana}</p>
              </div>
              <button 
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <section>
                <div className={`flex items-center justify-between gap-2 mb-2 text-xs font-bold ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={14} />
                    <span>説明</span>
                  </span>
                  <button
                    onClick={copyDesc}
                    title="説明をコピー"
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${dk ? 'hover:bg-slate-800 text-indigo-400/80 hover:text-indigo-400' : 'hover:bg-slate-100 text-indigo-600/80 hover:text-indigo-600'}`}
                  >
                    <Copy size={13} />
                  </button>
                </div>
                {copied === 'desc' && <p className="text-[10px] font-bold text-emerald-500 mb-1">コピーしました</p>}
                <p className={`text-sm leading-relaxed font-medium ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                  {term.longDesc}
                </p>
              </section>

              {term.relatedTerms.length > 0 && (
                <section className="hidden">
                  <div className={`flex items-center gap-1.5 mb-2 text-xs font-bold ${dk ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    <Layers size={14} />
                    <span>関連ワード</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {term.relatedTerms.map((word) => {
                      const relatedTermObj = IT_TERMS.find(t => t.word === word);
                      return (
                        <button
                          key={word}
                          onClick={() => relatedTermObj && onRelatedTermClick(relatedTermObj)}
                          className={`
                            px-2.5 py-1 rounded-lg text-xs font-bold border transition-all
                            ${relatedTermObj 
                              ? (dk ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100')
                              : (dk ? 'border-slate-800 bg-slate-800/50 text-slate-500 cursor-default' : 'border-slate-100 bg-slate-50 text-slate-400 cursor-default')}
                          `}
                        >
                          <span className="flex items-center gap-1">
                            <Hash size={10} />
                            {word}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <div className={`pt-4 border-t ${dk ? 'border-slate-800/60' : 'border-slate-100'} flex gap-2`}>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(term.word + " IT用語 意味")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${dk ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  検索
                  <ExternalLink size={12} />
                </a>
                {term.externalUrl && (
                  <a
                    href={term.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors"
                  >
                    公式
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
