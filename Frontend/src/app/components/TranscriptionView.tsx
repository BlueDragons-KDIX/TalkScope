import React, { useRef, useEffect, useState } from 'react';
import { highlightTerms } from '../utils/termDetection';
import { Term } from '../data/terms';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Radio } from 'lucide-react';

interface TranscriptionViewProps {
  transcript: string;
  isListening: boolean;
  onToggleListening: () => void;
  onTermClick: (term: Term) => void;
  onTermHover: (term: Term | null) => void;
  darkMode?: boolean;
  themeColor?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcript,
  isListening,
  onToggleListening,
  onTermClick,
  onTermHover,
  darkMode = true,
  themeColor = 'indigo'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredTermId, setHoveredTermId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const parts = highlightTerms(transcript);

  const dk = darkMode;

  return (
    <div className={`flex flex-col h-full rounded-xl border overflow-hidden transition-colors ${dk ? 'bg-[#0d0e1a] border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${dk ? 'border-slate-800/60 bg-slate-900/30' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isListening ? (dk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600') : (dk ? 'bg-slate-800 text-slate-500 border border-slate-700/50' : 'bg-slate-100 text-slate-400')}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : dk ? 'bg-slate-600' : 'bg-slate-300'}`} />
            {isListening ? 'REC' : 'IDLE'}
          </div>
          <span className={`text-xs font-bold ${dk ? 'text-slate-400' : 'text-slate-600'}`}>
            文字起こし
          </span>
        </div>
        <button
          onClick={onToggleListening}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
            ${isListening 
              ? (dk ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100')
              : (dk ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-indigo-600 text-white hover:bg-indigo-500')}
          `}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          {isListening ? '停止' : '開始'}
        </button>
      </div>

      {/* Transcript Body */}
      <div 
        ref={scrollRef}
        className={`flex-1 p-5 overflow-y-auto text-sm leading-relaxed scroll-smooth ${dk ? 'text-slate-300' : 'text-slate-600'}`}
      >
        {!transcript && (
          <div className={`h-full flex flex-col items-center justify-center ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
            <Radio className="mb-3 opacity-30" size={40} />
            <p className="text-sm font-bold opacity-60">音声入力待機中</p>
            <p className="text-[11px] opacity-40 mt-1">マイクボタンを押して開始</p>
          </div>
        )}
        
        <div className="whitespace-pre-wrap font-medium">
          {parts.map((part, index) => {
            if (part.type === 'term') {
              const term = part.term as Term;
              return (
                <span key={index} className="relative group inline-block mx-0.5">
                  <button
                    onClick={() => onTermClick(term)}
                    onMouseEnter={() => {
                      setHoveredTermId(term.id);
                      onTermHover(term);
                    }}
                    onMouseLeave={() => {
                      setHoveredTermId(null);
                      onTermHover(null);
                    }}
                    className={`
                      px-1 py-0.5 rounded cursor-pointer transition-all font-bold
                      ${dk 
                        ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/20' 
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}
                    `}
                  >
                    {part.content}
                  </button>
                  
                  <AnimatePresence>
                    {hoveredTermId === term.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-lg shadow-2xl z-30 pointer-events-none border ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-white'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold text-indigo-400">{term.category}</span>
                          <span className="text-[10px] text-slate-500">Lv.{term.level}</span>
                        </div>
                        <div className="text-xs font-bold mb-1">{term.word}</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{term.shortDesc}</p>
                        <div className={`absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent ${dk ? 'border-t-slate-800' : 'border-t-slate-900'}`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
              );
            }
            return <span key={index}>{part.content}</span>;
          })}
          {isListening && (
            <span className={`inline-block w-0.5 h-4 ml-0.5 ${dk ? 'bg-indigo-400 shadow-lg shadow-indigo-400/50' : 'bg-indigo-500'} animate-pulse align-middle rounded-full`} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 border-t text-[10px] font-mono ${dk ? 'border-slate-800/60 text-slate-600 bg-slate-900/20' : 'border-slate-100 text-slate-400'}`}>
        <span className="opacity-60">マーキングされた用語をクリックで詳細表示</span>
      </div>
    </div>
  );
};