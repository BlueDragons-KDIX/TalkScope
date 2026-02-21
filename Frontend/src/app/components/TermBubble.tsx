import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Term } from '../data/terms';
import { Info, Star } from 'lucide-react';

interface TermBubbleProps {
  term: Term;
  weight: number;
  onClick: (term: Term) => void;
  darkMode?: boolean;
  isActive?: boolean;
  isPinned?: boolean;
  onTogglePin: (termId: string) => void;
  size?: number;
  isAutoPlay?: boolean;
  intervalSec?: number;
}

export const TermBubble: React.FC<TermBubbleProps> = ({
  term,
  weight,
  onClick,
  darkMode = true,
  isActive = false,
  isPinned = false,
  onTogglePin,
  size: explicitSize,
  isAutoPlay = false,
  intervalSec = 5,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isShowingDesc, setIsShowingDesc] = useState(false);

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isAutoPlay) {
      intervalId = setInterval(() => {
        setIsShowingDesc((prev) => !prev);
      }, intervalSec * 1000);
    } else {
      setIsShowingDesc(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoPlay, intervalSec]);

  const dk = darkMode;

  // 重要度とピンの有無によってサイズ（半径×2）を変える
  const defaultSize = Math.max(60, 80 + weight * 10) + (isPinned ? 20 : 0);
  const size = explicitSize ?? defaultSize;

  const darkColors: Record<string, string> = {
    Frontend: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    Backend: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    Infra: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    "AI/Data": 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    General: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
  };

  const lightColors: Record<string, string> = {
    Frontend: 'bg-blue-50 border-blue-200 text-blue-700',
    Backend: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    Infra: 'bg-violet-50 border-violet-200 text-violet-700',
    "AI/Data": 'bg-amber-50 border-amber-200 text-amber-700',
    General: 'bg-slate-50 border-slate-200 text-slate-700',
  };

  const colors = dk ? darkColors : lightColors;

  return (
    <div className="relative inline-block m-1.5">
      <motion.div
        layout
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: [0, -4, 0],
        }}
        exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
        transition={{
          scale: { type: "spring", damping: 14, stiffness: 200 },
          y: { repeat: Infinity, duration: 3 + Math.random() * 2, ease: "easeInOut" }
        }}
        whileHover={{ scale: 1.08, zIndex: 10 }}
        onClick={() => onClick(term)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          flex items-center justify-center rounded-full border cursor-pointer
          ${colors[term.category]}
          font-bold text-center p-2 break-words
          transition-shadow duration-200
          ${isActive ? 'ring-2 ring-white/30 scale-110 shadow-lg' : ''}
          ${isHovered && dk ? 'shadow-lg shadow-indigo-500/10' : ''}
          ${isShowingDesc ? 'text-[9px] leading-tight font-medium p-3' : ''}
        `}
        style={{ width: size, height: size, fontSize: isShowingDesc ? undefined : Math.max(11, size / 7) }}
      >
        <AnimatePresence mode="wait">
          {isShowingDesc ? (
          <motion.div
            key="desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="line-clamp-4 overflow-hidden"
            title={term.shortDesc}
          >
            {term.shortDesc}
          </motion.div>
        ) : (
          <motion.div
            key="word"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {term.word}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

      {/* 星ボタン（バブル右上） */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(term.id);
        }}
        title={isPinned ? 'ピン解除' : 'ピン留め（消えなくなります）'}
        className={`
          absolute top-0 right-0 z-10
          w-5 h-5 flex items-center justify-center
          rounded-full transition-all duration-200
          ${isPinned
            ? 'text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]'
            : 'text-slate-500 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
          }
          ${isHovered || isPinned ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <Star
          size={12}
          fill={isPinned ? 'currentColor' : 'none'}
          className="transition-all duration-200"
        />
      </button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 shadow-2xl rounded-lg p-2.5 z-20 pointer-events-none border ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[9px] font-bold ${dk ? 'text-indigo-400' : 'text-indigo-500'}`}>{term.category}</span>
              <span className={`text-[9px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Lv.{term.level}</span>
              {isPinned && (
                <span className="text-[9px] font-bold text-yellow-400 flex items-center gap-0.5 ml-auto">
                  <Star size={8} fill="currentColor" />ピン中
                </span>
              )}
            </div>
            <div className="text-xs font-bold mb-0.5">{term.word}</div>
            <p className={`text-[10px] leading-relaxed line-clamp-2 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{term.shortDesc}</p>
            <div className={`mt-1.5 text-[9px] font-medium flex items-center gap-1 ${dk ? 'text-indigo-400' : 'text-indigo-500'}`}>
              <Info size={8} /> クリックで詳細
            </div>
            <div className={`absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent ${dk ? 'border-t-slate-800' : 'border-t-white'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};