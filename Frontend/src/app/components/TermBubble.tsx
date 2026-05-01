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
  isAutoPlay?: boolean;
  intervalSec?: number;
  /** 用語マップコンテナの参照（ツールチップを枠内に収めるため） */
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
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
  mapContainerRef,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isShowingDesc, setIsShowingDesc] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; showBelow: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleElementRef = useRef<HTMLDivElement>(null);

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


  // 重要度によってサイズ（半径×2）を変える。ピン留め時は標準より一回り大きいサイズ(80)に固定
  const defaultSize = isPinned ? 80 : Math.max(60, 80 + weight * 10);
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

  // term.id のハッシュで鮮やかなパレットから安定した色を選択
  const PALETTE_DARK = [
    'bg-blue-500/20 border-blue-400/40 text-blue-200',
    'bg-violet-500/20 border-violet-400/40 text-violet-200',
    'bg-emerald-500/20 border-emerald-400/40 text-emerald-200',
    'bg-rose-500/20 border-rose-400/40 text-rose-200',
    'bg-amber-500/20 border-amber-400/40 text-amber-200',
    'bg-cyan-500/20 border-cyan-400/40 text-cyan-200',
    'bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200',
    'bg-teal-500/20 border-teal-400/40 text-teal-200',
    'bg-orange-500/20 border-orange-400/40 text-orange-200',
    'bg-indigo-500/20 border-indigo-400/40 text-indigo-200',
    'bg-lime-500/20 border-lime-400/40 text-lime-200',
    'bg-pink-500/20 border-pink-400/40 text-pink-200',
  ];
  const PALETTE_LIGHT = [
    'bg-blue-100 border-blue-300 text-blue-700',
    'bg-violet-100 border-violet-300 text-violet-700',
    'bg-emerald-100 border-emerald-300 text-emerald-700',
    'bg-rose-100 border-rose-300 text-rose-700',
    'bg-amber-100 border-amber-300 text-amber-700',
    'bg-cyan-100 border-cyan-300 text-cyan-700',
    'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700',
    'bg-teal-100 border-teal-300 text-teal-700',
    'bg-orange-100 border-orange-300 text-orange-700',
    'bg-indigo-100 border-indigo-300 text-indigo-700',
    'bg-lime-100 border-lime-300 text-lime-700',
    'bg-pink-100 border-pink-300 text-pink-700',
  ];
  const hashStr = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  const palette = dk ? PALETTE_DARK : PALETTE_LIGHT;
  const termColor = palette[hashStr(term.id) % palette.length];

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
          ${termColor}
          font-bold text-center break-words
          transition-shadow duration-200
          ${isActive ? 'ring-2 ring-white/30 scale-110 shadow-lg' : ''}
          ${isHovered && dk ? 'shadow-lg shadow-current/20' : ''}
        `}
        style={{ width: size, height: size }}
      >
        <AnimatePresence>
          {isShowingDesc ? (
            <motion.div
              key="desc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center p-3 overflow-hidden rounded-full"
              title={term.shortDesc}
            >
              <span className="line-clamp-4 overflow-hidden w-full leading-tight font-medium" style={{ fontSize: Math.min(10, Math.max(6, size * 0.13)) }}>
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
              <span className="w-full" style={{ fontSize: Math.min(14, Math.max(7, size * 0.18)) }}>
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
          title={isPinned ? 'ピン解除' : 'ピン留め'}
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