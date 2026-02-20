import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Term } from '../data/terms';
import { TermBubble } from './TermBubble';
import { Hexagon, Shuffle, Pause, ChevronUp, ChevronDown } from 'lucide-react';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Frontend: { bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/30',    dot: '#60a5fa' },
  Backend:  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: '#34d399' },
  Infra:    { bg: 'bg-violet-500/20',  text: 'text-violet-300',  border: 'border-violet-500/30',  dot: '#a78bfa' },
  'AI/Data':{ bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: '#fbbf24' },
  General:  { bg: 'bg-slate-500/20',   text: 'text-slate-300',   border: 'border-slate-500/30',   dot: '#94a3b8' },
};

interface BubbleCloudProps {
  activeTerms: Term[];
  termWeights: Record<string, number>;
  onTermClick: (term: Term) => void;
  darkMode?: boolean;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  selectedTermId?: string;
  pinnedTermIds: Set<string>;
  onTogglePin: (termId: string) => void;
}

export const BubbleCloud: React.FC<BubbleCloudProps> = ({
  activeTerms,
  termWeights,
  onTermClick,
  darkMode = true,
  categoryFilter,
  onCategoryFilterChange,
  selectedTermId,
  pinnedTermIds,
  onTogglePin,
}) => {
  const dk = darkMode;
  const categories = ['ALL', ...Object.keys(CATEGORY_COLORS)];

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [intervalSec, setIntervalSec] = useState(4);
  const [showSlider, setShowSlider] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTermsRef = useRef(activeTerms);

  useEffect(() => {
    activeTermsRef.current = activeTerms;
  }, [activeTerms]);

  useEffect(() => {
    if (isAutoPlay) {
      const tick = () => {
        const terms = activeTermsRef.current;
        if (terms.length === 0) return;
        const next = terms[Math.floor(Math.random() * terms.length)];
        onTermClick(next);
      };
      tick();
      intervalRef.current = setInterval(tick, intervalSec * 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutoPlay, intervalSec, onTermClick]);

  useEffect(() => {
    if (activeTerms.length === 0 && isAutoPlay) setIsAutoPlay(false);
  }, [activeTerms.length, isAutoPlay]);

  const toggleAutoPlay = () => {
    if (activeTerms.length === 0) return;
    setIsAutoPlay(prev => !prev);
  };

  return (
    <div className={`flex flex-col h-full transition-colors ${dk ? 'bg-[#0d0e1a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/30' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="flex items-center gap-2">
          <Hexagon size={13} className={dk ? 'text-slate-600' : 'text-slate-300'} />
          <span className={`text-xs font-bold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>用語マップ</span>
        </div>
        <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${dk ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
          {activeTerms.length} terms
        </span>
      </div>

      {/* Category filter tabs */}
      <div
        className={`px-3 py-2 border-b flex gap-1 overflow-x-auto flex-shrink-0 ${dk ? 'border-slate-800/40' : 'border-slate-100'}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {categories.map(cat => {
          const c = CATEGORY_COLORS[cat];
          const isActive = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryFilterChange(cat)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                isActive
                  ? cat === 'ALL'
                    ? (dk ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800')
                    : `${c.bg} ${c.text} border ${c.border}`
                  : dk ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {cat === 'ALL' ? 'すべて' : cat}
            </button>
          );
        })}
      </div>

      {/* Bubbles area (relative for absolute positioning of auto-play button) */}
      <div className="relative flex-1 overflow-auto p-4 flex flex-wrap items-center justify-center content-start">
        {dk && (
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}

        {activeTerms.length === 0 ? (
          <div className={`text-center ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
            <Hexagon className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-xs font-bold opacity-60">用語抽出待機中</p>
            <p className="text-[10px] opacity-40 mt-1">音声から検出された用語が<br />ここに表示されます</p>
          </div>
        ) : (
          activeTerms.map(term => (
            <TermBubble
              key={term.id}
              term={term}
              weight={termWeights[term.id] || 0}
              onClick={onTermClick}
              darkMode={dk}
              isActive={selectedTermId === term.id}
              isPinned={pinnedTermIds.has(term.id)}
              onTogglePin={onTogglePin}
            />
          ))
        )}

        {/* Auto-play button (bottom-right, always visible) */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3 z-10">

          {/* Slider panel (appears above button) */}
          <AnimatePresence>
            {showSlider && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className={`flex flex-col gap-3 p-4 rounded-2xl border shadow-2xl ${
                  dk ? 'bg-[#12132a] border-slate-700/60 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
                style={{ minWidth: 180 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">切換え間隔</span>
                  <span className={`text-lg font-black tabular-nums ${isAutoPlay ? 'text-indigo-400' : dk ? 'text-slate-400' : 'text-slate-500'}`}>
                    {intervalSec}<span className="text-xs font-bold ml-0.5">秒</span>
                  </span>
                </div>

                {/* Large slider */}
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={intervalSec}
                    onChange={e => setIntervalSec(Number(e.target.value))}
                    disabled={activeTerms.length === 0}
                    className={`w-full h-2.5 rounded-full appearance-none cursor-pointer ${
                      activeTerms.length === 0 ? 'cursor-not-allowed opacity-40' : ''
                    } ${isAutoPlay ? 'accent-indigo-500' : (dk ? 'accent-slate-500' : 'accent-slate-400')}`}
                    style={{ background: dk ? '#1e293b' : '#e2e8f0' }}
                  />
                </div>

                {/* Tick labels */}
                <div className={`flex justify-between text-[9px] font-bold -mt-1 ${dk ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span>遅(1s)</span>
                  <span>速(10s)</span>
                </div>

                {/* Step buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIntervalSec(s => Math.max(1, s - 1))}
                    disabled={intervalSec <= 1}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      dk ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-30'
                    }`}
                  >
                    <ChevronDown size={14} className="mx-auto" />
                  </button>
                  <span className={`text-xs font-mono font-black w-10 text-center ${isAutoPlay ? 'text-indigo-400' : dk ? 'text-slate-400' : 'text-slate-500'}`}>
                    {intervalSec}s
                  </span>
                  <button
                    onClick={() => setIntervalSec(s => Math.min(10, s + 1))}
                    disabled={intervalSec >= 10}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      dk ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-30'
                    }`}
                  >
                    <ChevronUp size={14} className="mx-auto" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-play main button */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-end gap-2">
              {/* Speed toggle (小) */}
              <motion.button
                onClick={() => setShowSlider(s => !s)}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                title="間隔の設定"
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg text-xs font-black transition-colors ${
                  showSlider
                    ? (dk ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300' : 'bg-indigo-50 border-indigo-300 text-indigo-600')
                    : (dk ? 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400')
                }`}
              >
                {intervalSec}s
              </motion.button>

              {/* Main auto-play button (大) */}
              <motion.button
                onClick={toggleAutoPlay}
                disabled={activeTerms.length === 0}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: activeTerms.length === 0 ? 1 : 1.06 }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl relative transition-colors ${
                  activeTerms.length === 0
                    ? (dk ? 'bg-slate-800 border-2 border-slate-700 text-slate-700 cursor-not-allowed' : 'bg-slate-100 border-2 border-slate-200 text-slate-300 cursor-not-allowed')
                    : isAutoPlay
                      ? (dk ? 'bg-indigo-600 text-white shadow-indigo-600/40 hover:bg-indigo-500' : 'bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-500')
                      : (dk ? 'bg-slate-800 border-2 border-slate-600 text-slate-300 hover:border-indigo-500/60 hover:text-indigo-300' : 'bg-white border-2 border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-500')
                }`}
                title={isAutoPlay ? '自動切換えを停止' : '自動切換えを開始'}
              >
                {isAutoPlay && (
                  <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20 pointer-events-none" />
                )}
                {isAutoPlay ? <Pause size={22} fill="currentColor" /> : <Shuffle size={22} />}
              </motion.button>
            </div>
            <span className={`text-[10px] font-bold ${
              isAutoPlay ? 'text-indigo-400' : dk ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {isAutoPlay ? '切換え中' : '自動切換え'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};