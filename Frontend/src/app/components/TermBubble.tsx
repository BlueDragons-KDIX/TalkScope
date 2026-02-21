import React, { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Term } from '../data/terms';
import { Info, Star } from 'lucide-react';

const TOOLTIP = { W: 176, H: 120, PAD: 8, GAP_ABOVE: 12 } as const;

interface TermBubbleProps {
  term: Term;
  weight: number;
  onClick: (term: Term) => void;
  darkMode?: boolean;
  isActive?: boolean;
  isPinned?: boolean;
  onTogglePin?: (termId: string) => void;
  size?: number;
  /** 用語マップコンテナの参照（ツールチップを枠内に収めるため） */
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
  showDescription?: boolean;
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
  mapContainerRef,
  showDescription = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; showBelow: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleElementRef = useRef<HTMLDivElement>(null);



  // 重要度とピンの有無によってサイズ（半径×2）を変える
  const defaultSize = Math.max(60, 80 + weight * 10) + (isPinned ? 20 : 0);
  const size = explicitSize ?? defaultSize;

  const updateTooltipPos = useCallback(() => {
    if (!containerRef.current) {
      setTooltipPos(null);
      return;
    }
    const bubbleEl = bubbleElementRef.current ?? containerRef.current.querySelector<HTMLElement>('div[style*="width"]');
    if (!bubbleEl) {
      setTooltipPos(null);
      return;
    }

    const rect = bubbleEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const { top: bubbleTop, bottom: bubbleBottom, height: bubbleH } = rect;
    const bubbleGap = bubbleH * 0.2;

    const map = mapContainerRef?.current?.getBoundingClientRect();
    const mapLeft = (map?.left ?? 0) + TOOLTIP.PAD;
    const mapRight = (map?.right ?? window.innerWidth) - TOOLTIP.W - TOOLTIP.PAD;
    const mapTop = (map?.top ?? 0) + TOOLTIP.PAD;
    const mapBottom = (map?.bottom ?? window.innerHeight) - TOOLTIP.PAD;

    const showBelow = mapBottom - bubbleBottom >= TOOLTIP.H;
    const left = Math.max(mapLeft, Math.min(centerX - TOOLTIP.W / 2, mapRight));

    const top = showBelow
      ? Math.max(mapTop, Math.min(bubbleBottom + TOOLTIP.PAD + bubbleGap, mapBottom - TOOLTIP.H))
      : Math.min(mapBottom - TOOLTIP.H, Math.max(mapTop, bubbleTop - TOOLTIP.GAP_ABOVE - TOOLTIP.H));

    setTooltipPos({ left, top, showBelow });
  }, [mapContainerRef, size]);

  useLayoutEffect(() => {
    if (!isHovered) {
      setTooltipPos(null);
      return;
    }
    updateTooltipPos();
  }, [isHovered, updateTooltipPos, size]);

  // バブルは物理エンジンで毎フレーム動くため、ホバー中は rAF でツールチップ位置を追従させる
  useEffect(() => {
    if (!isHovered) return;
    let rafId: number;
    const tick = () => {
      updateTooltipPos();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isHovered, updateTooltipPos]);

  useEffect(() => {
    if (!isHovered) return;
    const mapEl = mapContainerRef?.current;
    const onScroll = () => updateTooltipPos();
    const onResize = () => updateTooltipPos();
    if (mapEl) mapEl.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      if (mapEl) mapEl.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [isHovered, mapContainerRef, updateTooltipPos]);


  const dk = darkMode;

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
    <div ref={containerRef} className="relative inline-block m-1.5">
      <motion.div
        ref={bubbleElementRef}
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
        // 右クリックでバブルに星をつける
        onContextMenu={(e) => {
          e.preventDefault();
          onTogglePin?.(term.id);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative flex items-center justify-center rounded-full border cursor-pointer
          ${colors[term.category]}
          font-bold text-center break-words
          transition-shadow duration-200
          ${isActive ? 'ring-2 ring-white/30 scale-110 shadow-lg' : ''}
          ${isHovered && dk ? 'shadow-lg shadow-indigo-500/10' : ''}
        `}
        style={{ width: size, height: size }}
      >
        <AnimatePresence>
          {showDescription ? (
            <motion.div
              key="desc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center p-3 overflow-hidden rounded-full"
              title={term.shortDesc}
            >
              <span className="line-clamp-4 overflow-hidden w-full text-[9px] leading-tight font-medium">
                {term.shortDesc}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="word"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden rounded-full"
            >
              <span className="w-full" style={{ fontSize: Math.max(11, size / 7) }}>
                {term.word}
              </span>
            </motion.div>
          )}


        {/* 星ボタン：バブル内に配置して y アニメーションと同期 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin?.(term.id);
          }}
          title={isPinned ? 'ピン解除' : 'ピン留め（消えなくなります）'}
          className={`
            absolute top-0 right-2 z-10
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
        </AnimatePresence>
      </motion.div>

      {/* ツールチップ：ポータルで body に描画（枠外にはみ出さないよう position:fixed で配置） */}
      {isHovered && tooltipPos && createPortal(
        <motion.div
          initial={{ opacity: 0, y: tooltipPos.showBelow ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className={`fixed w-44 shadow-2xl rounded-lg p-2.5 z-9999 pointer-events-none border ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
          }}
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
            {/* 矢印：バブル中央に向けて指す（上向き or 下向き） */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent ${
                tooltipPos.showBelow
                  ? `-top-3 ${dk ? 'border-b-slate-800' : 'border-b-white'}`
                  : `bottom-0 translate-y-full ${dk ? 'border-t-slate-800' : 'border-t-white'}`
              }`}
            />
        </motion.div>,
        document.body
      )}
    </div>
  );
};