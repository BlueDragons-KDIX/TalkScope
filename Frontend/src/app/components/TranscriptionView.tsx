import React, { useRef, useEffect, useState } from 'react';
import { highlightTerms } from '../utils/termDetection';
import { Term } from '../data/terms';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Radio, Play } from 'lucide-react';

interface TranscriptionViewProps {
  transcript: string;
  isListening: boolean;
  onToggleListening: () => void;
  onTermClick: (term: Term) => void;
  onTermHover: (term: Term | null) => void;
  onLoadDemo?: () => void;
  darkMode?: boolean;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcript,
  isListening,
  onToggleListening,
  onTermClick,
  onTermHover,
  onLoadDemo,
  darkMode = true,
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
    <div className={`flex flex-col h-full transition-colors ${dk ? 'bg-[#0d0e1a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/30' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isListening ? (dk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600') : (dk ? 'bg-slate-800 text-slate-500 border border-slate-700/50' : 'bg-slate-100 text-slate-400')}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : dk ? 'bg-slate-600' : 'bg-slate-300'}`} />
            {isListening ? 'REC' : 'IDLE'}
          </div>
          <span className={`text-xs font-bold ${dk ? 'text-slate-400' : 'text-slate-600'}`}>文字起こし</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono ${dk ? 'text-slate-600' : 'text-slate-400'}`}>{transcript.length} chars</span>
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isListening
                ? (dk ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100')
                : (dk ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-indigo-600 text-white hover:bg-indigo-500')
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {isListening ? '停止' : '開始'}
          </button>
        </div>
      </div>

      {/* Transcript Body */}
      <div
        ref={scrollRef}
        className={`flex-1 p-5 overflow-y-auto text-sm leading-relaxed scroll-smooth ${dk ? 'text-slate-300' : 'text-slate-600'}`}
      >
        {!transcript ? (
          <div className={`h-full flex flex-col items-center justify-center text-center gap-3 ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              isListening ? (dk ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-indigo-300 bg-indigo-50') : (dk ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50')
            }`}>
              <Radio size={28} className={isListening ? (dk ? 'text-indigo-400' : 'text-indigo-500') : (dk ? 'text-slate-600' : 'text-slate-300')} />
            </div>
            <div>
              <p className={`text-sm font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                {isListening ? '聞いています...' : '音声入力待機中'}
              </p>
              <p className={`text-xs mt-1 ${dk ? 'text-slate-700' : 'text-slate-300'}`}>
                マイクボタンを押して開始、またはデモを試してください
              </p>
            </div>
            {onLoadDemo && (
              <button
                onClick={onLoadDemo}
                className={`flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${dk ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
              >
                <Play size={11} />デモテキストを試す
              </button>
            )}
          </div>
        ) : (
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
                      className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all font-bold ${
                        dk
                          ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35 border border-indigo-500/30'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      {part.content}
                    </button>

                    <AnimatePresence>
                      {hoveredTermId === term.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -8 }}
                          transition={{ duration: 0.12 }}
                          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 rounded-xl shadow-2xl z-30 pointer-events-none border ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-white'}`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold ${dk ? 'text-indigo-400' : 'text-indigo-300'}`}>{term.category}</span>
                            <span className={`text-[10px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Lv.{term.level}</span>
                          </div>
                          <div className="text-sm font-black mb-1">{term.word}</div>
                          <p className={`text-[11px] leading-relaxed line-clamp-2 ${dk ? 'text-slate-400' : 'text-slate-300'}`}>{term.shortDesc}</p>
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
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 border-t text-[10px] font-mono flex-shrink-0 ${dk ? 'border-slate-800/60 text-slate-600 bg-slate-900/20' : 'border-slate-100 text-slate-400'}`}>
        <span className="opacity-60">マーキングされた用語をクリックで詳細表示</span>
      </div>
    </div>
  );
};