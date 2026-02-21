import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Term } from '../data/terms';
import { TermBubble } from './TermBubble';
import { Hexagon, Shuffle, Pause, ChevronUp, ChevronDown } from 'lucide-react';

interface BubbleCloudProps {
  activeTerms: Term[];
  termWeights: Record<string, number>;
  onTermClick: (term: Term) => void;
  darkMode?: boolean;
  selectedTermId?: string;
  pinnedTermIds?: Set<string>;
  onTogglePin?: (id: string) => void;
}

export const BubbleCloud: React.FC<BubbleCloudProps> = ({
  activeTerms,
  termWeights,
  onTermClick,
  darkMode = true,
  selectedTermId,
  pinnedTermIds,
  onTogglePin,
}) => {
  const dk = darkMode;  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [intervalSec, setIntervalSec] = useState(4);
  const [showSlider, setShowSlider] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTermsRef = useRef(activeTerms);

  // 用語⇔説明の反転状態を管理するIDセット（Auto-Play ONのときのみ使用）
  const [descIds, setDescIds] = useState<Set<string>>(new Set());

  // ── バブル物理エンジン ──────────────────────────────────────
  const engineRef = useRef<{
    nodes: Map<string, { x: number; y: number; vx: number; vy: number; radius: number }>;
    width: number;
    height: number;
    rafId: number | null;
  }>({ nodes: new Map(), width: 800, height: 500, rafId: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // コンテナの初期幅を記憶し、それをデフォルトサイズとする
  const defaultWidthRef = useRef<number | null>(null);
  
  // マップのリサイズを検知して再描画をトリガーする用
  const [mapSize, setMapSize] = useState({ width: 800, height: 500 });

  // コンテナの寸法を計測（リサイズ対応）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      const h = e.contentRect.height;
      if (w > 0 && defaultWidthRef.current === null) {
        defaultWidthRef.current = w;
      }
      
      // ResizeObserverからの過剰な再レンダリングを防ぐため、10px以上の差がある場合のみ更新
      setMapSize(prev => {
        if (Math.abs(prev.width - w) > 10 || Math.abs(prev.height - h) > 10) {
          return { width: w, height: h };
        }
        return prev;
      });

      engineRef.current.width = w;
      engineRef.current.height = h;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ノードの追加・削除・半径更新（レンダリングのタイミングで同期）
  const activeIds = new Set(activeTerms.map(t => t.id));
  const engineNodes = engineRef.current.nodes;
  
  // デフォルト幅を基準にしてスケールダウン（大きくなる時は1.0でストップ）
  const DEFAULT_WIDTH = defaultWidthRef.current || 800;
  const currentWidth = mapSize.width;
  const scaleFactor = Math.min(1, currentWidth / DEFAULT_WIDTH);

  for (const id of Array.from(engineNodes.keys())) {
    if (!activeIds.has(id)) engineNodes.delete(id);
  }
  for (const term of activeTerms) {
    const w = pinnedTermIds?.has(term.id) ? 0 : (termWeights[term.id] || 0);
    // スケールファクターを適用して半径を縮小
    const baseR = (Math.max(60, 80 + w * 10) + (pinnedTermIds?.has(term.id) ? 20 : 0)) / 2;
    const r = baseR * scaleFactor;

    if (!engineNodes.has(term.id)) {
      const cw = engineRef.current.width || 800;
      const ch = engineRef.current.height || 500;
      const startX = cw * (0.3 + Math.random() * 0.4);
      const startY = ch + r + Math.random() * 100; // 下から湧いてくる
      engineNodes.set(term.id, { x: startX, y: startY, vx: (Math.random()-0.5)*4, vy: -(Math.random()*4 + 2), radius: r });
    } else {
      engineNodes.get(term.id)!.radius = r; // サイズの動的更新
    }
  }

  // 物理シミュレーションループ
  useEffect(() => {
    const tick = () => {
      const e = engineRef.current;
      const nodes = Array.from(e.nodes.entries());
      const GRAVITY = -0.15; // 上に向かう浮力
      const DAMPING = 0.88;
      
      for (let i = 0; i < nodes.length; i++) {
        const [id1, n1] = nodes[i];
        
        // 浮力・中央に向かう力
        n1.vy += GRAVITY;
        const cx = e.width / 2;
        n1.vx += (cx - n1.x) * 0.0008; // 緩やかに中央へ
        
        // 他のバブルとの衝突判定（重なりによる反発）
        for (let j = i + 1; j < nodes.length; j++) {
           const [, n2] = nodes[j];
           const dx = n2.x - n1.x;
           const dy = n2.y - n1.y;
           const dist = Math.hypot(dx, dy);
           const minDist = n1.radius + n2.radius + 8; // +8px padding
           if (dist < minDist && dist > 0) {
              const force = (minDist - dist) * 0.08; 
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
           }
        }
        
        // 速度の適用と摩擦
        ['x', 'y'].forEach(axis => {
           const pos = axis as 'x'|'y';
           const vel = axis === 'x' ? 'vx' : 'vy';
           const max = axis === 'x' ? e.width : e.height;
           const min = 0;
           
           n1[pos] += n1[vel];
           n1[vel] *= DAMPING; // 摩擦
           
           // 壁との衝突
           if (n1[pos] - n1.radius < min) {
             n1[pos] = min + n1.radius;
             n1[vel] *= -0.4;
           } else if (n1[pos] + n1.radius > max) {
             n1[pos] = max - n1.radius;
             n1[vel] *= -0.4;
           }
        });
        
        // DOM要素の直接更新（Reactのライフサイクル外で高速描画）
        const el = bubbleRefs.current[id1];
        if (el) {
          el.style.transform = `translate3d(${n1.x - n1.radius}px, ${n1.y - n1.radius}px, 0)`;
        }
      }
      e.rafId = requestAnimationFrame(tick);
    };
    
    engineRef.current.rafId = requestAnimationFrame(tick);
    return () => {
      if (engineRef.current.rafId) cancelAnimationFrame(engineRef.current.rafId);
    };
  }, []);


  useEffect(() => {
    activeTermsRef.current = activeTerms;
  }, [activeTerms]);

  useEffect(() => {
    if (isAutoPlay) {
      // 最初のON時に即座に半数を「説明」にする
      const initToggle = () => {
        const terms = activeTermsRef.current;
        if (terms.length === 0) return;
        
        // シャッフルして約半分のIDを取得
        const shuffled = [...terms].sort(() => 0.5 - Math.random());
        const halfCount = Math.ceil(terms.length / 2);
        const nextDescIds = new Set(shuffled.slice(0, halfCount).map(t => t.id));
        setDescIds(nextDescIds);
      };
      initToggle();

      const tick = () => {
        const terms = activeTermsRef.current;
        if (terms.length === 0) return;
        
        // 現在「説明」になっているものを「用語」に戻し、「用語」になっているものを「説明」にする（完全反転）
        setDescIds(prev => {
          const next = new Set<string>();
          terms.forEach(t => {
            if (!prev.has(t.id)) {
              next.add(t.id);
            }
          });
          return next;
        });
      };
      intervalRef.current = setInterval(tick, intervalSec * 1000);
    } else {
      // OFFにした瞬間すべて「用語」表示に戻す
      setDescIds(new Set());
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
  }, [isAutoPlay, intervalSec]);

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
      <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/30' : 'border-slate-100 bg-slate-50/80'}`}>
        <div className="flex items-center gap-2">
          <Hexagon size={13} className={dk ? 'text-slate-600' : 'text-slate-300'} />
          <span className={`text-xs font-bold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>用語マップ</span>
        </div>
        <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${dk ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
          {activeTerms.length} terms
        </span>
      </div>

      {/* Bubbles area — 座標固定+上方フロート */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
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
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
            <Hexagon className="mb-3 opacity-30" size={40} />
            <p className="text-xs font-bold opacity-60">用語抖出待機中</p>
            <p className="text-[10px] opacity-40 mt-1">音声から検出された用語が<br />ここに表示されます</p>
          </div>
        ) : (
          <AnimatePresence>
            {activeTerms.map(term => {
              const node = engineNodes.get(term.id);
              if (!node) return null;
              return (
                <motion.div
                  key={term.id}
                  ref={el => { bubbleRefs.current[term.id] = el; }}
                  className="absolute left-0 top-0 will-change-transform"
                  style={{ transform: `translate3d(${node.x - node.radius}px, ${node.y - node.radius}px, 0)` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 1.2 } }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0, transition: { duration: 1.2, ease: "easeOut" } }}
                    transition={{ type: 'spring', damping: 18, stiffness: 220 }}
                  >
                    <TermBubble
                        term={term}
                        weight={pinnedTermIds?.has(term.id) ? 0 : (termWeights[term.id] || 0)}
                        onClick={onTermClick}
                        darkMode={dk}
                        isActive={selectedTermId === term.id}
                        isPinned={pinnedTermIds?.has(term.id)}
                        onTogglePin={onTogglePin ? () => onTogglePin(term.id) : undefined}
                        size={node.radius * 2}
                        mapContainerRef={containerRef}
                        showDescription={descIds.has(term.id)}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
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