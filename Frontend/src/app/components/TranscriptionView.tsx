import React, { useRef, useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { highlightTerms } from '../utils/termDetection';
import { Term } from '../data/terms';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Radio, Play, RotateCcw, FastForward, Pause, LoaderCircle, Star } from 'lucide-react';
import { UseDemoStreamReturn } from '../hooks/useDemoStream';

const TOOLTIP = { W: 208, H: 100, PAD: 8, GAP_ABOVE: 12 } as const;

interface TranscriptionViewProps {
  transcript: string;
  isListening: boolean;
  onToggleListening: () => void;
  onClearTranscript?: () => void;
  onTermClick: (term: Term) => void;
  onTermHover: (term: Term | null) => void;
  isPinned?: Set<string>;
  onTogglePin?: (termId: string) => void;
  onLoadDemo?: () => void;
  /** 非同期ストリーミングデモの制御オブジェクト（コア機能とは独立） */
  demoStream?: UseDemoStreamReturn;
  darkMode?: boolean;
  /** API で発見された動的用語（ハイライト対象に含める） */
  apiTerms?: Term[];
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcript,
  isListening,
  onToggleListening,
  onClearTranscript,
  onTermClick,
  onTermHover,
  isPinned = new Set(),
  onTogglePin,
  onLoadDemo,
  demoStream,
  darkMode = true,
  apiTerms = [],
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const termButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [hoveredPartIndex, setHoveredPartIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number; showBelow: boolean } | null>(null);

  const updateTooltipPos = useCallback((partIndex: number) => {
    const btn = termButtonRefs.current[partIndex];
    if (!btn || !scrollRef.current) {
      setTooltipPos(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const { top: bubbleTop, bottom: bubbleBottom, height: bubbleH } = rect;
    const bubbleGap = bubbleH * 0.2;
    const map = scrollRef.current.getBoundingClientRect();
    const mapLeft = map.left + TOOLTIP.PAD;
    const mapRight = map.right - TOOLTIP.W - TOOLTIP.PAD;
    const mapTop = map.top + TOOLTIP.PAD;
    const mapBottom = map.bottom - TOOLTIP.PAD;
    const spaceAbove = bubbleTop - mapTop;
    const showBelow = spaceAbove < TOOLTIP.H;
    const left = Math.max(mapLeft, Math.min(centerX - TOOLTIP.W / 2, mapRight));
    const top = showBelow
      ? Math.max(mapTop, Math.min(bubbleBottom + TOOLTIP.PAD + bubbleGap, mapBottom - TOOLTIP.H))
      : Math.min(mapBottom - TOOLTIP.H, Math.max(mapTop, bubbleTop - TOOLTIP.GAP_ABOVE - TOOLTIP.H));
    setTooltipPos({ left, top, showBelow });
  }, []);

  useLayoutEffect(() => {
    if (hoveredPartIndex === null) {
      setTooltipPos(null);
      return;
    }
    updateTooltipPos(hoveredPartIndex);
  }, [hoveredPartIndex, updateTooltipPos]);

  useEffect(() => {
    if (hoveredPartIndex === null || !scrollRef.current) return;
    const el = scrollRef.current;
    const onScroll = () => updateTooltipPos(hoveredPartIndex);
    const onResize = () => updateTooltipPos(hoveredPartIndex);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [hoveredPartIndex, updateTooltipPos]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const parts = highlightTerms(transcript, apiTerms);
  const dk = darkMode;

  const isStreaming = demoStream?.status === 'playing';
  const isPaused = demoStream?.status === 'paused';
  const isDone = demoStream?.status === 'done';
  const progress = demoStream?.progress ?? 0;

  return (
    <div className={`flex flex-col h-full transition-colors ${dk ? 'bg-[#0d0e1a]' : 'bg-white'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/30' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
            isStreaming ? (dk ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600') :
            isListening ? (dk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600') :
            (dk ? 'bg-slate-800 text-slate-500 border border-slate-700/50' : 'bg-slate-100 text-slate-400')
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              isStreaming ? 'bg-purple-400 animate-pulse' :
              isListening ? 'bg-emerald-400 animate-pulse' :
              dk ? 'bg-slate-600' : 'bg-slate-300'
            }`} />
            {isStreaming ? 'DEMO' : isListening ? 'REC' : 'IDLE'}
          </div>
          <span className={`text-xs font-bold ${dk ? 'text-slate-400' : 'text-slate-600'}`}>文字起こし</span>
        </div>
        <span className={`text-[10px] font-mono ${dk ? 'text-slate-600' : 'text-slate-400'}`}>{transcript.length} chars</span>
      </div>

      {/* Streaming progress bar */}
      {(isStreaming || isPaused || isDone) && (
        <div className={`h-0.5 w-full ${dk ? 'bg-slate-800' : 'bg-slate-100'} shrink-0`}>
          <motion.div
            className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-purple-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear', duration: 0.1 }}
          />
        </div>
      )}

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

            {/* Demo buttons (in empty state) */}
            <div className="flex flex-col gap-2 items-center w-full max-w-[200px]">
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  className={`flex items-center gap-1.5 w-full justify-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${dk ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                >
                  <Play size={11} />即時デモ
                </button>
              )}
              {demoStream && (
                <button
                  onClick={() => demoStream.startStream()}
                  className={`flex items-center gap-1.5 w-full justify-center px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${dk ? 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border-purple-500/30' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'}`}
                >
                  <FastForward size={11} />ライブデモ（長文）
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-medium">
            {parts.map((part, index) => {
              if (part.type === 'term') {
                const term = part.term as Term;
                return (
                  <span key={index} className="relative group inline-block mx-0.5">
                    <button
                      ref={(el) => { termButtonRefs.current[index] = el; }}
                      onClick={() => onTermClick(term)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onTogglePin?.(term.id);
                      }}
                      onMouseEnter={() => { setHoveredPartIndex(index); onTermHover(term); }}
                      onMouseLeave={() => { setHoveredPartIndex(null); onTermHover(null); }}
                      className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all font-bold ${
                        dk
                          ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35 border border-indigo-500/30'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      {part.content}
                    </button>

                  </span>
                );
              }
              return <span key={index}>{part.content}</span>;
            })}
            {isListening && (
              <span className={`inline-block w-0.5 h-4 ml-0.5 ${dk ? 'bg-indigo-400 shadow-lg shadow-indigo-400/50' : 'bg-indigo-500'} animate-pulse align-middle rounded-full`} />
            )}
            {isStreaming && (
              <span className={`inline-block w-0.5 h-4 ml-0.5 bg-purple-400 animate-pulse align-middle rounded-full`} />
            )}
          </div>
        )}
      </div>

      {/* ホバー時のツールチップ：ポータルで body に描画（見切れ防止） */}
      {hoveredPartIndex !== null && tooltipPos && (() => {
        const part = parts[hoveredPartIndex];
        const hoveredTerm = part?.type === 'term' ? (part as { type: 'term'; content: string; term: Term }).term : null;
        if (!hoveredTerm) return null;
        return createPortal(
          <motion.div
            initial={{ opacity: 0, y: tooltipPos.showBelow ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className={`fixed w-52 p-3 rounded-xl shadow-2xl z-9999 pointer-events-none border ${dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-white'}`}
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            {isPinned.has(hoveredTerm.id) && (
              <div className="absolute top-2 right-2 text-yellow-400">
                <Star size={12} fill="currentColor" />
              </div>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold ${dk ? 'text-indigo-400' : 'text-indigo-300'}`}>{hoveredTerm.category}</span>
              <span className={`text-[10px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>Lv.{hoveredTerm.level}</span>
            </div>
            <div className="text-sm font-black mb-1">{hoveredTerm.word}</div>
            <p className={`text-[11px] leading-relaxed line-clamp-2 ${dk ? 'text-slate-400' : 'text-slate-300'}`}>{hoveredTerm.shortDesc}</p>
            <div
              className={`absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent ${
                tooltipPos.showBelow
                  ? `-top-3 ${dk ? 'border-b-slate-800' : 'border-b-slate-900'}`
                  : `top-full ${dk ? 'border-t-slate-800' : 'border-t-slate-900'}`
              }`}
            />
          </motion.div>,
          document.body
        );
      })()}

      {/* Footer: Big round recording buttons */}
      <div className={`px-5 py-4 border-t shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/20' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="flex items-center justify-center gap-5">

          {/* リセットボタン */}
          <div className="flex flex-col items-center gap-1.5">
            <motion.button
              onClick={onClearTranscript}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.06 }}
              className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-colors shadow-lg ${
                dk
                  ? 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-red-500/10 hover:border-red-500/60 hover:text-red-400'
                  : 'bg-white border-slate-300 text-slate-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500'
              }`}
              title="録音終了・リセット"
            >
              <RotateCcw size={20} />
            </motion.button>
            <span className={`text-[10px] font-bold ${dk ? 'text-slate-600' : 'text-slate-400'}`}>リセット</span>
          </div>

          {/* 録音開始/中断ボタン（メイン） */}
          <div className="flex flex-col items-center gap-1.5">
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.button
                  key="stop"
                  onClick={onToggleListening}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center relative shadow-2xl bg-red-500 hover:bg-red-400 text-white shadow-red-500/30"
                  title="録音を中断"
                >
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25 pointer-events-none" />
                  <Square size={26} fill="currentColor" />
                </motion.button>
              ) : (
                <motion.button
                  key="start"
                  onClick={onToggleListening}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  whileTap={{ scale: 0.92 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${
                    dk
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                  title="録音開始"
                >
                  <Mic size={32} />
                </motion.button>
              )}
            </AnimatePresence>
            <span className={`text-[10px] font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              {isListening ? '中断' : '録音開始'}
            </span>
          </div>

          {/* ライブデモボタン＋速度スライダー（右側） */}
          {demoStream && (
            <div className="flex flex-col items-center gap-2">
              {/* 速度スライダー: pos 0(遅)〜100(速), pos30≒3518ms */}
              {(() => {
                const msToPos = (ms: number) => Math.round((5000 - ms) / (5000 - 60) * 100);
                const posToMs = (pos: number) => Math.round(5000 - pos / 100 * (5000 - 60));
                const pos = msToPos(demoStream.intervalMs);
                return (
                  <div className={`flex flex-col gap-1 w-full px-1 ${
                    isStreaming || isPaused ? 'opacity-100' : (dk ? 'opacity-50' : 'opacity-60')
                  } transition-opacity`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold ${dk ? 'text-slate-600' : 'text-slate-400'}`}>速度</span>
                      <span className={`text-[9px] font-black font-mono ${isStreaming ? 'text-purple-400' : (dk ? 'text-slate-500' : 'text-slate-400')}`}>
                        {demoStream.intervalMs >= 2000 ? '超遅'
                          : demoStream.intervalMs >= 400 ? '遅'
                          : demoStream.intervalMs >= 250 ? '普通'
                          : demoStream.intervalMs >= 130 ? '速い'
                          : '超速'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={pos}
                      onChange={e => demoStream.setIntervalMs(posToMs(Number(e.target.value)))}
                      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${
                        isStreaming ? 'accent-purple-500' : (dk ? 'accent-slate-500' : 'accent-slate-400')
                      }`}
                      style={{ background: dk ? '#1e293b' : '#e2e8f0' }}
                      title={`速度: ${demoStream.intervalMs}ms (${pos}/100)`}
                    />
                    <div className={`flex justify-between text-[8px] font-bold ${dk ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span>遅</span>
                      <span>速</span>
                    </div>
                  </div>
                );
              })()}

              {/* ライブデモトグルボタン */}
              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.button
                    key="stream-pause"
                    onClick={() => demoStream.pauseStream()}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    whileTap={{ scale: 0.92 }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center relative border-2 shadow-lg ${
                      dk ? 'bg-purple-600 border-purple-500 text-white shadow-purple-600/30' : 'bg-purple-600 border-purple-500 text-white shadow-purple-600/20'
                    }`}
                    title="デモを一時停止"
                  >
                    <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20 pointer-events-none" />
                    <Pause size={20} fill="currentColor" />
                  </motion.button>
                ) : isPaused ? (
                  <motion.button
                    key="stream-resume"
                    onClick={() => demoStream.startStream()}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    whileTap={{ scale: 0.92 }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg ${
                      dk ? 'bg-purple-500/20 border-purple-500/60 text-purple-300' : 'bg-purple-50 border-purple-300 text-purple-600'
                    }`}
                    title="デモを再開"
                  >
                    <LoaderCircle size={20} />
                  </motion.button>
                ) : (
                  <motion.button
                    key="stream-start"
                    onClick={() => demoStream.startStream()}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    whileTap={{ scale: 0.92 }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-colors shadow-lg ${
                      dk
                        ? 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-purple-500/10 hover:border-purple-500/50 hover:text-purple-400'
                        : 'bg-white border-slate-300 text-slate-400 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-500'
                    }`}
                    title="ライブデモを開始"
                  >
                    <FastForward size={20} />
                  </motion.button>
                )}
              </AnimatePresence>
              <span className={`text-[10px] font-bold ${
                isStreaming ? 'text-purple-400' : isPaused ? 'text-purple-400/60' : dk ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {isStreaming ? `${progress}%` : isPaused ? '再開' : 'ライブデモ'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};