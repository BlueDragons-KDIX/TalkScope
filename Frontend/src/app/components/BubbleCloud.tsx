import React, { useEffect, useRef, useState } from 'react';
import { Term } from '../data/terms';
import { TermBubble } from './TermBubble';
import { Hexagon, Shuffle, Pause } from 'lucide-react';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Frontend: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', dot: '#60a5fa' },
  Backend: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: '#34d399' },
  Infra: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30', dot: '#a78bfa' },
  'AI/Data': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', dot: '#fbbf24' },
  General: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30', dot: '#94a3b8' },
};

interface BubbleCloudProps {
  activeTerms: Term[];
  termWeights: Record<string, number>;
  onTermClick: (term: Term) => void;
  darkMode?: boolean;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  selectedTermId?: string;
}

export const BubbleCloud: React.FC<BubbleCloudProps> = ({
  activeTerms,
  termWeights,
  onTermClick,
  darkMode = true,
  categoryFilter,
  onCategoryFilterChange,
  selectedTermId,
}) => {
  const dk = darkMode;
  const categories = ['ALL', ...Object.keys(CATEGORY_COLORS)];

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  // intervalSec: 1〜10秒、デフォルト4秒
  const [intervalSec, setIntervalSec] = useState(4);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTermsRef = useRef(activeTerms);

  useEffect(() => {
    activeTermsRef.current = activeTerms;
  }, [activeTerms]);

  // isAutoPlay または intervalSec が変わったら再起動
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
    if (activeTerms.length === 0 && isAutoPlay) {
      setIsAutoPlay(false);
    }
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

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${dk ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
            {activeTerms.length} terms
          </span>

          {/* 自動切換えボタン + スピードスライダー */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all ${activeTerms.length === 0
              ? (dk ? 'opacity-30 border-slate-700/50' : 'opacity-30 border-slate-200')
              : isAutoPlay
                ? 'bg-indigo-600/20 border-indigo-500/50'
                : (dk ? 'border-slate-700/50 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')
            }`}>
            {/* トグルボタン */}
            <button
              onClick={toggleAutoPlay}
              disabled={activeTerms.length === 0}
              title={isAutoPlay ? '自動切換えを停止' : '自動切換えを開始'}
              className={`relative flex items-center gap-1 text-[10px] font-bold transition-all ${activeTerms.length === 0
                  ? (dk ? 'cursor-not-allowed text-slate-600' : 'cursor-not-allowed text-slate-400')
                  : isAutoPlay
                    ? 'text-indigo-300'
                    : (dk ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
            >
              {isAutoPlay && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
              {isAutoPlay ? <Pause size={10} /> : <Shuffle size={10} />}
              {isAutoPlay ? '停止' : '自動切換え'}
            </button>

            {/* スピードスライダー（区切り線 + スライダー） */}
            <div className={`w-px h-4 ${dk ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-mono font-bold whitespace-nowrap ${isAutoPlay ? 'text-indigo-300' : (dk ? 'text-slate-500' : 'text-slate-400')
                }`}>
                {intervalSec}s
              </span>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={intervalSec}
                onChange={e => setIntervalSec(Number(e.target.value))}
                disabled={activeTerms.length === 0}
                title={`切換え間隔: ${intervalSec}秒`}
                className={`w-16 h-1 rounded-full appearance-none cursor-pointer
                  ${activeTerms.length === 0 ? 'cursor-not-allowed' : ''}
                  ${isAutoPlay ? 'accent-indigo-400' : (dk ? 'accent-slate-500' : 'accent-slate-400')}
                `}
                style={{
                  background: dk ? '#1e293b' : '#e2e8f0',
                }}
              />
              <span className={`text-[9px] ${dk ? 'text-slate-600' : 'text-slate-400'} hidden sm:inline`}>速</span>
            </div>
          </div>
        </div>
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
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${isActive
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

      {/* Bubbles */}
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
            />
          ))
        )}
      </div>
    </div>
  );
};