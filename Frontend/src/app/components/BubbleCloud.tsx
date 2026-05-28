import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Term } from '../data/terms';
import { TermBubble } from './TermBubble';
import { Hexagon } from 'lucide-react';
import { useContentFontScaleStore } from '../../stores/contentFontScaleStore';
import { scaledContentFontPx } from '../utils/contentFontScale';
import { useAccentTheme } from '../../theme/AccentThemeContext';
import { termChipStyle } from '../../theme/accentStyles';
import {
  useTermMapWindowSettingsStore,
} from '../../stores/termMapWindowSettingsStore';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Frontend: { bg: 'bg-blue-500/20',    text: 'text-blue-300',    border: 'border-blue-500/30',    dot: '#60a5fa' },
  Backend:  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: '#34d399' },
  Infra:    { bg: 'bg-violet-500/20',  text: 'text-violet-300',  border: 'border-violet-500/30',  dot: '#a78bfa' },
  'AI/Data':{ bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: '#fbbf24' },
  General:  { bg: 'bg-slate-500/20',   text: 'text-slate-300',   border: 'border-slate-500/30',   dot: '#94a3b8' },
};

/** レイアウト変更でアンマウントされても基準幅を保持（枠が小さくなった時にバブルを自動で縮小するため） */
let sharedDefaultWidth: number | null = null;

/** 主題ベクトル（APIでベクトル化した主題テキストの平均ベクトル）。類似度計算用 */
export interface ThemeVectorResult {
  vector: number[];
  dim: number;
}

interface BubbleCloudProps {
  activeTerms: Term[];
  onTermClick: (term: Term) => void;
  darkMode?: boolean;
  selectedTermId?: string;
  isPinned: Set<string>;
  onTogglePin: (termId: string) => void;
  /** カテゴリフィルター（'ALL' または category 名） */
  categoryFilter?: string;
  /** カテゴリフィルター変更 */
  onCategoryFilterChange?: (category: string) => void;
}

export const BubbleCloud: React.FC<BubbleCloudProps> = ({
  activeTerms,
  onTermClick,
  darkMode = true,
  selectedTermId,
  isPinned,
  onTogglePin,
  categoryFilter = 'ALL',
  onCategoryFilterChange,
}) => {
  const dk = darkMode;
  const { rgb } = useAccentTheme();
  const contentFontScale = useContentFontScaleStore(s => s.scale);
  const masterSizeScale = useTermMapWindowSettingsStore(s => s.masterSizeScale);
  const bubbleSizeScale = useTermMapWindowSettingsStore(s => s.bubbleSizeScale);
  const textFontSizePx = useTermMapWindowSettingsStore(s => s.textFontSizePx);
  const isAutoPlay = useTermMapWindowSettingsStore(s => s.autoSwitchEnabled);
  const intervalSec = useTermMapWindowSettingsStore(s => s.autoSwitchIntervalSec);
  const maxVisibleTerms = useTermMapWindowSettingsStore(s => s.maxVisibleTerms);
  const setAutoSwitchEnabled = useTermMapWindowSettingsStore(s => s.setAutoSwitchEnabled);
  const categories = ['ALL', 'ピン中', ...Object.keys(CATEGORY_COLORS)];
  const effectiveBubbleScale = masterSizeScale * bubbleSizeScale;

  const activeTermsRef = useRef(activeTerms);

  // 用語⇔説明の反転状態を管理するIDセット（Auto-Play ONのときのみ使用）


  // ── バブル物理エンジン ──────────────────────────────────────
  const engineRef = useRef<{
    nodes: Map<string, { x: number; y: number; vx: number; vy: number; radius: number }>;
    width: number;
    height: number;
    rafId: number | null;
  }>({ nodes: new Map(), width: 800, height: 500, rafId: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // マップのリサイズを検知して再描画をトリガーする用
  const [mapSize, setMapSize] = useState({ width: 800, height: 500 });

  // コンテナの寸法を計測（リサイズ対応）。レイアウト変更でアンマウントされても sharedDefaultWidth で基準を保持
  useEffect(() => {
    if (categoryFilter === 'ピン中') return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      const h = e.contentRect.height;
      if (w <= 0 || h <= 0) return;
      // 初回または枠が大きくなったら基準幅を更新（枠が小さくなった時にバブルを縮小する基準）
      if (sharedDefaultWidth === null || w > sharedDefaultWidth) {
        sharedDefaultWidth = w;
      }
      setMapSize({ width: w, height: h });
      engineRef.current.width = w;
      engineRef.current.height = h;
    });
    ro.observe(el);
    // 初回に即時寸法を反映（戻った直後の1フレームで正しいサイズにする）
    const w = el.getBoundingClientRect().width;
    const h = el.getBoundingClientRect().height;
    if (w > 0 && h > 0) {
      if (sharedDefaultWidth === null || w > sharedDefaultWidth) {
        sharedDefaultWidth = w;
      }
      engineRef.current.width = w;
      engineRef.current.height = h;
      setMapSize({ width: w, height: h });
    }
    return () => ro.disconnect();
  }, [categoryFilter]);

  // ノードの追加・削除・半径更新（レンダリングのタイミングで同期）
  const activeIds = new Set(activeTerms.map(t => t.id));
  const engineNodes = engineRef.current.nodes;

  // ピン中表示の間はノードをクリアし、バブルに戻った時に全ノードを再初期化して左上に固まるのを防ぐ
  if (categoryFilter === 'ピン中') {
    engineNodes.clear();
  } else {
  const DEFAULT_WIDTH = sharedDefaultWidth ?? 800;
  const currentWidth = mapSize.width;
  const scaleFactor = Math.min(1, currentWidth / DEFAULT_WIDTH);
  for (const id of Array.from(engineNodes.keys())) {
    if (!activeIds.has(id)) engineNodes.delete(id);
  }
  const SCORE_SCALE_FACTOR = 3.0;
  for (const term of activeTerms) {
    const isTermPinned = isPinned?.has(term.id);
    const baseR = 20;
    const scoreMult = 1 + term.score * SCORE_SCALE_FACTOR;
    let r = baseR * scaleFactor * scoreMult;
    r = Math.min(r, 95); // 極端に大きくなりすぎないよう上限

    // ピン留めされているバブルは、標準より一回り大きいサイズに統一
    if (isTermPinned) {
      r = 38 * scaleFactor;
    }

    // ユーザー指定の倍率を適用
    r = r * effectiveBubbleScale;
    // バブルの最小半径を20に統一
    r = Math.max(20, r);

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
    // 従来の AutoPlay 処理は削除し、各 TermBubble 内で setInterval を個別処理させるように変更した
  }, [isAutoPlay, intervalSec]);

  useEffect(() => {
    if (activeTerms.length === 0 && isAutoPlay) setAutoSwitchEnabled(false);
  }, [activeTerms.length, isAutoPlay, setAutoSwitchEnabled]);

  return (
    <div className={`flex flex-col h-full transition-colors ${dk ? 'bg-[#0d0e1a]' : 'bg-white'}`}>
      {/* Header: filter + scale slider + term count — 1 row */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b shrink-0 ${dk ? 'border-slate-800/60 bg-slate-900/30' : 'border-slate-100 bg-slate-50/80'}`}>
        <Hexagon size={13} className={dk ? 'text-slate-600' : 'text-slate-300'} />
        {onCategoryFilterChange && (
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className={`text-[10px] py-1 px-2 rounded border shrink-0 ${dk ? 'bg-slate-800/50 border-slate-700/50 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <span className={`ml-auto text-[10px] font-mono border px-1.5 py-0.5 rounded shrink-0 ${dk ? 'bg-slate-800/50 border-slate-700/50 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
          {categoryFilter === 'ピン中'
            ? `${activeTerms.length} ピン`
            : `${activeTerms.length}/${maxVisibleTerms} terms`}
        </span>
      </div>
      {/* ピン中: IndexedDB のピン留め一覧を表で表示（文字起こしハイライト風） */}
      {categoryFilter === 'ピン中' ? (
        <div className="flex-1 overflow-auto">
          {activeTerms.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${dk ? 'text-slate-600' : 'text-slate-400'}`}>
              <Hexagon className="mb-3 opacity-30" size={40} />
              <p className="text-xs font-bold opacity-60">ピン留めした用語がありません</p>
              <p className="text-[10px] opacity-40 mt-1">用語を右クリックでピン留めすると<br />ここに一覧表示されます</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className={`sticky top-0 z-10 ${dk ? 'bg-slate-900/95 border-b border-slate-700/60' : 'bg-slate-50/95 border-b border-slate-200'}`}>
                  <tr>
                    <th className={`text-[10px] font-bold py-2 px-3 ${dk ? 'text-slate-500' : 'text-slate-500'}`}>用語</th>
                    <th className={`text-[10px] font-bold py-2 px-3 ${dk ? 'text-slate-500' : 'text-slate-500'}`}>カテゴリ</th>
                    <th className={`text-[10px] font-bold py-2 px-3 ${dk ? 'text-slate-500' : 'text-slate-500'}`}>説明</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTerms.map((term) => (
                    <tr
                      key={term.id}
                      className={`border-b ${dk ? 'border-slate-800/60 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50/80'}`}
                    >
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => onTermClick(term)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onTogglePin(term.id);
                          }}
                          className="px-1.5 py-0.5 rounded-md cursor-pointer transition-[filter] font-bold text-left hover:brightness-110"
                          style={{
                            ...termChipStyle(dk, rgb),
                            fontSize: scaledContentFontPx(12, contentFontScale),
                          }}
                        >
                          {term.word}
                        </button>
                      </td>
                      <td
                        className={`py-2 px-3 ${dk ? 'text-slate-400' : 'text-slate-600'}`}
                        style={{ fontSize: scaledContentFontPx(12, contentFontScale) }}
                      >
                        {term.category}
                      </td>
                      <td className="py-2 px-3 max-w-[180px] align-top">
                        <div
                          className={`overflow-x-auto overflow-y-hidden whitespace-nowrap max-h-12 ${dk ? 'text-slate-500' : 'text-slate-500'}`}
                          style={{ fontSize: scaledContentFontPx(11, contentFontScale) }}
                        >
                          {term.shortDesc}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
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
            <p className="text-xs font-bold opacity-60">用語検出待機中</p>
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
                      weight={term.score}
                      onClick={onTermClick}
                      darkMode={dk}
                      isActive={selectedTermId === term.id}
                      isPinned={isPinned.has(term.id)}
                      onTogglePin={onTogglePin}
                      size={node.radius * 2}
                      isAutoPlay={isAutoPlay}
                      intervalSec={intervalSec}
                      masterSizeScale={masterSizeScale}
                      textFontSizePx={textFontSizePx}
                      mapContainerRef={containerRef}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

      </div>
        </>
      )}
    </div>
  );
};
