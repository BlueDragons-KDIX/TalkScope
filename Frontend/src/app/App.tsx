import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useDemoStream } from './hooks/useDemoStream';
import { useVectorSend } from '@/app/hooks/useVectorSend';
import { useReferDict, type DictTermResult } from '@/app/hooks/useReferDict';
import type { VectorPayload } from '@/app/utils/vectorSendWithOverlap';
import { fetchThemeVector, type ThemeVectorResult } from '@/app/utils/themeVectorApi';
import { DEMO_TEXT_INSTANT } from './demo/demo';
import { TranscriptionView } from './components/TranscriptionView';
import { BubbleCloud } from './components/BubbleCloud';
import { TermDetailPanel } from './components/TermDetailPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { DictionaryManagerModal } from './components/DictionaryManagerModal';
import { Term } from './data/terms';
import { getAllPinnedTerms, addPinnedTerm, removePinnedTerm } from './db';
import { extractTerms, countTermFrequencies } from './utils/termDetection';
import { Book, LayoutGrid, LibraryBig, Settings, Target } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { Toaster, toast } from 'sonner';
import { LayoutEngine } from './layout/LayoutEngine';
import { LayoutNode, PanelId } from './layout/types';
import { cosineSimilarity, getMockThemeVector, MOCK_DIM } from './utils/mockVectors';
import {
  makeDefaultLayout,
  make2x2Layout,
  makeHorizontalLayout,
  makeVerticalLayout,
  makeLeftRightLayout,
  removeLeaf,
} from './layout/layoutUtils';




// レイアウトプリセット定義
const PRESETS = [
  { key: 'default', label: 'デフォルト', make: makeDefaultLayout },
  { key: 'leftRight', label: '左右+縦分割', make: makeLeftRightLayout },
  { key: '2x2', label: '2×2', make: make2x2Layout },
  { key: 'horizontal', label: '横4列', make: makeHorizontalLayout },
  { key: 'vertical', label: '縦4列', make: makeVerticalLayout },
] as const;

const App: React.FC = () => {
  if (import.meta.env.DEV) console.log('[TalkScope] App.tsx 読み込み（主題入力あり）');
  const { transcript, setTranscript, isListening, startListening, stopListening, error } = useSpeechRecognition();

  const [activeTerms, setActiveTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [termWeights, setTermWeights] = useState<Record<string, number>>({});
  const [searchHistory, setSearchHistory] = useState<Term[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictionaryManagerOpen, setIsDictionaryManagerOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutNode>(makeDefaultLayout);
  const [settings, setSettings] = useState({ darkMode: false, themeColor: 'indigo' });
  const [isPinned, setIsPinned] = useState<Set<string>>(new Set());
  /** ピン留めした用語一覧（IndexedDB と同期・ピン中タブで表示） */
  const [pinnedTermsList, setPinnedTermsList] = useState<Term[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  /** バブルサイズ計算用：主題（ベクトル類似度の基準） */
  const [themeText, setThemeText] = useState('');
  /** 主題テキストをAPIでベクトル化した結果（類似度計算用） */
  const [themeVector, setThemeVector] = useState<ThemeVectorResult | null>(null);
  /** API (refer_dictionary) で取得した動的用語一覧 */
  const [apiTerms, setApiTerms] = useState<Term[]>([]);
  /** API 用語の意味ベクトル (termId → vector)。バブルサイズ計算用 */
  const [termVectors, setTermVectors] = useState<Record<string, number[]>>({});
  /** フィルタ基準語（現状固定）との類似度フィルタ有効化 */
  const [isSimilarityFilterEnabled, setIsSimilarityFilterEnabled] = useState(false);
  /** ベクトルフィルタの強さ（0〜100） */
  const [similarityFilterStrength, setSimilarityFilterStrength] = useState(8);
  /** "it" の基準ベクトル（初期はフォールバックで即時利用可能にする） */
  const [itReferenceVector, setItReferenceVector] = useState<number[] | null>(() => getMockThemeVector(MOCK_DIM));
  /** "it" ベクトルをバックエンドから取得できたか */
  const [isItReferenceReady, setIsItReferenceReady] = useState(false);
  /** term.id が未解決なときの補助ベクトル（word単位） */
  const [wordVectors, setWordVectors] = useState<Record<string, number[]>>({});

  // ── バブル寿命管理 refs ────────────────────────────────────────
  const termTimestamps    = useRef<Record<string, number>>({});       // termId → 追加時刻
  const deathRowRef       = useRef<Record<string, number>>({});       // termId → 削除待機リストに入った時刻
  const isPinnedRef  = useRef<Set<string>>(new Set());           // isPinned の ref ミラー
  const activeTermsRef    = useRef<Term[]>([]);                       // activeTerms の ref ミラー
  const historicalTermIdsRef = useRef<Set<string>>(new Set());        // これまでに抽出・生成された全用語ID（ゾンビ復活防止用）
  const fetchingWordSetRef = useRef<Set<string>>(new Set());
  const failedWordSetRef = useRef<Set<string>>(new Set());

  const normalizeWordKey = useCallback((word: string) => word.trim().toLowerCase(), []);

  // 起動時に IndexedDB からピン留め一覧を復元
  useEffect(() => {
    getAllPinnedTerms()
      .then((list) => {
        setPinnedTermsList(list);
        setIsPinned((prev) => {
          const next = new Set(prev);
          list.forEach((t) => next.add(t.id));
          return next;
        });
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[pinnedTerms] load failed', err);
      });
  }, []);

  // ── デモ機能（コア機能から独立） ──────────────────────────────
  const demoStream = useDemoStream({
    onAppend: (text) => setTranscript(text),
  });
  // ──────────────────────────────────────────────────────────────

  useVectorSend(transcript, {
    baseUrl: (import.meta.env.VITE_BACKEND_URL ?? '').trim() || (import.meta.env.VITE_VECTOR_API_URL ?? '').trim(),
    overlapSentences: Number(import.meta.env.VITE_VECTOR_OVERLAP_SENTENCES) || 5,
    sendEveryNSentences: Number(import.meta.env.VITE_VECTOR_SEND_EVERY_N_SENTENCES) || 5,
    intervalSec: Number(import.meta.env.VITE_VECTOR_SEND_INTERVAL_SEC) || 0,
    onSent: (payload: VectorPayload, result?: unknown) => {
      if (import.meta.env.DEV) console.log('[vector] payload', payload.sentences.length, result);
    },
    onError: (err: unknown) => console.warn('[vector] send error', err),
  });

  // ── refer_dictionary API（1文ずつ送信し用語・意味・ベクトルを取得） ──
  const handleDictResults = useCallback((results: DictTermResult[]) => {
    const newTerms: Term[] = [];
    const newVectors: Record<string, number[]> = {};
    for (const r of results) {
      newTerms.push(r.term);
      if (r.meaningVector && r.meaningVector.length > 0) {
        newVectors[r.term.id] = r.meaningVector;
      }
    }
    if (newTerms.length > 0) {
      setApiTerms(prev => [...prev, ...newTerms]);
      setTermVectors(prev => ({ ...prev, ...newVectors }));
    }
  }, []);

  useReferDict(transcript, {
    baseUrl: (import.meta.env.VITE_BACKEND_URL ?? '').trim(),
    intervalSec: 5,            // 5秒ごとのフォールバック送信
    trailingDebounceMs: 1000,  // 入力が1秒止まったら末尾の未完了文も送信
    onResults: handleDictResults,
    onError: (err: unknown) => console.warn('[referDict] send error', err),
  });

  // 主題テキストをデバウンスしてAPIでベクトル化し、類似度計算用に保持
  useEffect(() => {
    if (!themeText.trim()) {
      setThemeVector(null);
      return;
    }
    const t = setTimeout(() => {
      let cancelled = false;
      fetchThemeVector(themeText)
        .then((result) => {
          if (!cancelled) setThemeVector(result);
        })
        .catch((err) => {
          if (!cancelled) {
            setThemeVector(null);
            if (import.meta.env.DEV) console.warn('[themeVector]', err);
          }
        });
      return () => { cancelled = true; };
    }, 500);
    return () => clearTimeout(t);
  }, [themeText]);

  // フィルタ基準語 "it" のベクトルを起動時に取得
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchItReference = async () => {
      try {
        const result = await fetchThemeVector('it');
        if (cancelled) return;
        if (result?.vector?.length) {
          setItReferenceVector(result.vector);
          setIsItReferenceReady(true);
          return;
        }
      } catch (err) {
        if (!cancelled && import.meta.env.DEV) console.warn('[itReferenceVector]', err);
      }

      if (!cancelled) {
        setIsItReferenceReady(false);
        retryTimer = setTimeout(fetchItReference, 5000);
      }
    };

    void fetchItReference();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // term.id のベクトルが無い単語は word 単位で補助ベクトルを取得する
  useEffect(() => {
    const unresolvedWords = activeTerms
      .map((term) => ({ key: normalizeWordKey(term.word), word: term.word, id: term.id }))
      .filter(({ key, id }) =>
        key &&
        !termVectors[id]?.length &&
        !wordVectors[key]?.length &&
        !fetchingWordSetRef.current.has(key) &&
        !failedWordSetRef.current.has(key),
      );

    if (unresolvedWords.length === 0) return;

    unresolvedWords.forEach(({ key }) => fetchingWordSetRef.current.add(key));
    let cancelled = false;

    void Promise.all(
      unresolvedWords.map(async ({ key, word }) => {
        try {
          const result = await fetchThemeVector(word);
          if (cancelled) return null;
          if (result?.vector?.length) return { key, vector: result.vector };
          failedWordSetRef.current.add(key);
          return null;
        } catch (err) {
          failedWordSetRef.current.add(key);
          if (import.meta.env.DEV) console.warn('[wordVector]', word, err);
          return null;
        } finally {
          fetchingWordSetRef.current.delete(key);
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const merged: Record<string, number[]> = {};
      for (const row of rows) {
        if (!row) continue;
        merged[row.key] = row.vector;
      }
      if (Object.keys(merged).length > 0) {
        setWordVectors((prev) => ({ ...prev, ...merged }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeTerms, termVectors, wordVectors, normalizeWordKey]);

  const dk = settings.darkMode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dk);
  }, [dk]);

  useEffect(() => { if (error) toast.error(error); }, [error]);

  // refs の同期
  useEffect(() => { isPinnedRef.current = isPinned; }, [isPinned]);
  useEffect(() => { activeTermsRef.current = activeTerms; }, [activeTerms]);

  useEffect(() => {
    if (!transcript) return;
    const extracted = extractTerms(transcript, apiTerms);
    const now = Date.now();
    
    // まだ一度も画面に出ていない完全に新規の用語だけをフィルタリング
    const completelyNewTerms = extracted.filter(t => !historicalTermIdsRef.current.has(t.id));
    if (completelyNewTerms.length === 0) return;

    completelyNewTerms.forEach(t => {
      historicalTermIdsRef.current.add(t.id);
      termTimestamps.current[t.id] = now;
    });

    setActiveTerms(prev => [...prev, ...completelyNewTerms]);
  }, [transcript, apiTerms]);

  // ── バブル削除アルゴリズム (1秒ごとに実行) ───────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const current = activeTermsRef.current;
      if (current.length <= 20) {
        deathRowRef.current = {}; // 20個以下なら削除待機リストをリセット
        return;
      }

      const ts = termTimestamps.current;
      const deathRow = deathRowRef.current;
      const now = Date.now();

      // 古い順にソート (追加時刻が小さい = 古い)
      let terms = [...current];
      terms.sort((a, b) => (ts[a.id] ?? 0) - (ts[b.id] ?? 0));

      // 1. 30個を超過している分は即座に削除（もっとも古いもの）
      if (terms.length > 30) {
        const excess = terms.length - 30;
        const toRemove = terms.splice(0, excess);
        toRemove.forEach(t => delete deathRow[t.id]);
      }

      // 2. 20個〜30個の間のバブルにライフタイムを設定・判定
      if (terms.length > 20) {
        const excess = terms.length - 20;
        // 先頭（最も古いバブル）からの `excess` 個が削除対象
        const oldestExcess = terms.slice(0, excess);
        const survivors = terms.slice(excess);

        // 対象から外れたバブルは削除待機リストから解除
        survivors.forEach(t => delete deathRow[t.id]);

        let deletedAny = false;
        const finalTerms: Term[] = [];

        oldestExcess.forEach(t => {
          if (!deathRow[t.id]) {
            deathRow[t.id] = now; // 初めて20個を超過した枠に入った時の時刻
          }

          const elapsed = now - deathRow[t.id];
          const lifetime = 5000; // スターの有無に関係なく同じライフタイムで削除

          if (elapsed >= lifetime) {
            delete deathRow[t.id];
            deletedAny = true;
          } else {
            finalTerms.push(t);
          }
        });

        if (deletedAny) {
          terms = [...finalTerms, ...survivors];
        }
      } else {
        deathRowRef.current = {};
      }

      // 状態が変更されていれば更新
      if (terms.length !== current.length) {
        setActiveTerms(terms);
      }
    }, 1000);

    return () => clearInterval(id);
  }, []); // refs のみ使用するため依存配列は空

  const handleTermClick = useCallback((term: Term) => {
    setSelectedTerm(term);
    // ピン済みのバブルはクリックしても大きさ・重要度が変化しない
    if (isPinnedRef.current.has(term.id)) return;
    
    setTermWeights(prev => {
      const newWeight = (prev[term.id] || 0) + 1;
      
      // クリック回数が5回に達したら自動でピン留め
      if (newWeight === 5 && !isPinnedRef.current.has(term.id)) {
        setIsPinned(p => new Set(p).add(term.id));
        toast.success(`「${term.word}」が重要ワードとしてピン留めされました`);
      }
      
      return { ...prev, [term.id]: newWeight };
    });
    
    setSearchHistory(prev => [term, ...prev.filter(t => t.id !== term.id)].slice(0, 50));
  }, []);

  const handleTogglePin = useCallback((termId: string) => {
    setIsPinned((prev) => {
      const next = new Set(prev);
      if (next.has(termId)) {
        next.delete(termId);
        setTermWeights((p) => ({ ...p, [termId]: 0 }));
        termTimestamps.current[termId] = Date.now();
        setPinnedTermsList((p) => p.filter((t) => t.id !== termId));
        removePinnedTerm(termId).catch((err) => import.meta.env.DEV && console.warn('[pinnedTerms] remove failed', err));
      } else {
        next.add(termId);
        const term = activeTermsRef.current.find((t) => t.id === termId);
        if (term) {
          setPinnedTermsList((p) => (p.some((t) => t.id === termId) ? p : [...p, term]));
          addPinnedTerm(term).catch((err) => import.meta.env.DEV && console.warn('[pinnedTerms] add failed', err));
        }
      }
      return next;
    });
  }, []);

  const toggleListening = () => {
    if (isListening) { stopListening(); toast.info('録音を停止しました'); }
    else { startListening(); toast.success('🎙 録音を開始しました'); }
  };
  const loadDemo = () => { setTranscript(DEMO_TEXT_INSTANT); toast.success('デモテキストを読み込みました'); };
  const clearAll = () => {
    if (isListening) stopListening();
    demoStream.stopStream();
    setTranscript(''); setActiveTerms([]); setTermWeights({});
    setSelectedTerm(null);
    setIsPinned(new Set());
    setApiTerms([]);
    setTermVectors({});
    setWordVectors({});
    termTimestamps.current = {};
    deathRowRef.current = {};
    historicalTermIdsRef.current = new Set();
    fetchingWordSetRef.current.clear();
    failedWordSetRef.current.clear();
    toast.info('リセットしました');
  };

  const termSimilarities = useMemo(() => {
    const out: Record<string, number> = {};
    if (!itReferenceVector?.length) return out;

    for (const term of activeTerms) {
      const direct = termVectors[term.id];
      const fallback = wordVectors[normalizeWordKey(term.word)];
      const candidateVector = direct?.length ? direct : fallback?.length ? fallback : null;
      if (!candidateVector) continue;
      out[term.id] = cosineSimilarity(candidateVector, itReferenceVector);
    }
    return out;
  }, [activeTerms, termVectors, wordVectors, itReferenceVector, normalizeWordKey]);

  // 強さ(0〜100)をコサイン類似度しきい値に変換。
  // 仕様:
  // - 強さ 8 -> -0.12（既定）
  // - 前半(0〜50): 細かく変わる
  // - 後半(51〜100): 大きく変わる
  const similarityThreshold = useMemo(() => {
    const s = Math.max(0, Math.min(100, similarityFilterStrength));

    if (s <= 50) {
      // 2次式（アンカー: 0->-0.2, 8->-0.12, 50->0.1）
      const a = -0.000095238095;
      const b = 0.01076190476;
      return -0.2 + a * s * s + b * s;
    }

    // 後半は線形で粗く上げる（50->0.1, 100->0.9）
    return 0.1 + ((s - 50) / 50) * 0.8;
  }, [similarityFilterStrength]);

  const categoryFilteredTerms =
    categoryFilter === 'ALL'
      ? activeTerms
      : categoryFilter === 'ピン中'
        ? pinnedTermsList
        : activeTerms.filter(t => t.category === categoryFilter);
  const filteredTerms =
    isSimilarityFilterEnabled && categoryFilter !== 'ピン中' && itReferenceVector?.length
      ? categoryFilteredTerms.filter((term) => (termSimilarities[term.id] ?? -1) >= similarityThreshold)
      : categoryFilteredTerms;
  const termFrequencies = useMemo(() => countTermFrequencies(transcript, activeTerms), [transcript, activeTerms]);

  // パネルコンテンツ（useMemo で過剰な再生成を抑制）
  const panels: Record<PanelId, React.ReactNode> = useMemo(() => ({
    transcription: (
      <TranscriptionView
        transcript={transcript}
        isListening={isListening}
        onToggleListening={toggleListening}
        onClearTranscript={clearAll}
        onTermClick={handleTermClick}
        onTermHover={() => { }}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onLoadDemo={loadDemo}
        demoStream={demoStream}
        darkMode={dk}
        apiTerms={apiTerms}
      />
    ),
    bubbleCloud: (
      <BubbleCloud
        activeTerms={filteredTerms}
        termWeights={termWeights}
        termFrequencies={termFrequencies}
        onTermClick={handleTermClick}
        darkMode={dk}
        selectedTermId={selectedTerm?.id}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        themeVector={themeVector}
        themeText={themeText}
        termVectors={termVectors}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />
    ),
    detail: (
      <TermDetailPanel
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
        onRelatedTermClick={handleTermClick}
        darkMode={dk}
        isPinned={selectedTerm ? isPinned.has(selectedTerm.id) : false}
        onTogglePin={() => selectedTerm && handleTogglePin(selectedTerm.id)}
      />
    ),
    history: (
      <HistoryPanel
        history={searchHistory}
        onTermClick={handleTermClick}
        onClear={() => { setSearchHistory([]); toast.success('履歴を削除しました'); }}
        darkMode={dk}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [transcript, isListening, filteredTerms, termWeights, termFrequencies, selectedTerm, searchHistory, dk, categoryFilter, handleTermClick, isPinned, handleTogglePin, themeVector, themeText, termVectors, apiTerms]);

  return (
    <div
      className={`h-full flex flex-col font-sans transition-colors duration-500 ${dk ? 'bg-[#0a0b14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {dk && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
        </div>
      )}

      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className={`border-b sticky top-0 z-40 transition-colors ${dk ? 'bg-[#0d0e1a]/90 backdrop-blur-xl border-slate-800/60' : 'bg-white/90 backdrop-blur-xl border-slate-200'}`}>
        <div className="w-full min-w-0 px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Book size={18} />
            </div>
            <span className="text-lg font-black tracking-tight">TalkScope</span>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] hidden sm:inline">Pro</span>
          </div>

          {/* Actions（右詰め）: 主題 → レイアウト → API確認 → 設定 */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* 主題入力（非ホバー: アイコンのみ / ホバー: 横に伸びてテキスト表示） */}
            <label
              id="lexiflow-theme-input"
              className={`flex items-center overflow-hidden rounded-lg border shrink-0 py-2 transition-[width] duration-200 ease-out w-9 hover:w-64 focus-within:w-60 ${dk ? 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700/60' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
            >
              <span className="flex shrink-0 items-center justify-center w-9 h-6">
                <Target size={12} className={dk ? 'text-slate-600' : 'text-slate-400'} aria-hidden />
              </span>
              <input
                type="text"
                value={themeText}
                onChange={(e) => setThemeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="ハイライトしたいキーワードを入力"
                className={`bg-transparent border-none outline-none text-xs flex-1 min-w-0 px-0 py-0 ${dk ? 'text-slate-300 placeholder-slate-600' : 'text-slate-600 placeholder-slate-400'}`}
                aria-label="主題"
              />
            </label>
            {/* レイアウトプリセットメニュー */}
            <div className="relative">
              <button
                onClick={() => setIsLayoutMenuOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isLayoutMenuOpen ? (dk ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600') : (dk ? 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border-slate-700/50' : 'text-slate-500 hover:text-slate-700 bg-white border-slate-200 hover:bg-slate-50')}`}
              >
                <LayoutGrid size={13} />レイアウト
              </button>
              {isLayoutMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLayoutMenuOpen(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl border shadow-2xl overflow-hidden min-w-[160px] ${dk ? 'bg-[#12132a] border-slate-800/60' : 'bg-white border-slate-200'}`}>
                    {PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => { setLayout(p.make()); setIsLayoutMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${dk ? 'hover:bg-indigo-600/20 text-slate-300 hover:text-white' : 'hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>


            <button
              onClick={() => setIsDictionaryManagerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                dk
                  ? 'text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 border-slate-700/50'
                  : 'text-slate-500 hover:text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <LibraryBig size={13} />
              単語管理
            </button>


            <button onClick={() => setIsSettingsOpen(true)} className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'}`}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Layout Engine */}
      <div className="relative z-10 flex-1 w-full" style={{ height: 'calc(100vh - 56px)' }}>
        <LayoutEngine
          layout={layout}
          onLayoutChange={setLayout}
          darkMode={dk}
          themeColor={settings.themeColor}
          panels={panels}
          onClose={(panelId) => {
            const nextLayout = removeLeaf(layout, panelId);
            if (nextLayout) {
              setLayout(nextLayout);
            } else {
              toast.error("最後のパネルは閉じられません");
            }
          }}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={s => setSettings(prev => ({ ...prev, ...s }))}
        similarityFilterEnabled={isSimilarityFilterEnabled}
        onSimilarityFilterEnabledChange={setIsSimilarityFilterEnabled}
        similarityFilterStrength={similarityFilterStrength}
        onSimilarityFilterStrengthChange={setSimilarityFilterStrength}
        similarityReferenceWord="IT"
        similarityReady={isItReferenceReady}
      />

      <DictionaryManagerModal
        isOpen={isDictionaryManagerOpen}
        onClose={() => setIsDictionaryManagerOpen(false)}
        darkMode={dk}
      />
    </div>
  );
};

export default App;
