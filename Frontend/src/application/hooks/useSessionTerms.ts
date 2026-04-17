import { useState, useEffect, useRef, useCallback } from 'react';
import type { Term } from '@/domain/models/terms';
import { getAllPinnedTerms, addPinnedTerm, removePinnedTerm } from '@/infrastructure/storage/db';
import { extractTerms, countTermFrequencies } from '@/domain/services/termDetection';
import { toast } from 'sonner';

export function useSessionTerms(transcript: string, apiTerms: Term[]) {
  const [activeTerms, setActiveTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [termWeights, setTermWeights] = useState<Record<string, number>>({});
  const [searchHistory, setSearchHistory] = useState<Term[]>([]);
  const [isPinned, setIsPinned] = useState<Set<string>>(new Set());
  const [pinnedTermsList, setPinnedTermsList] = useState<Term[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const termTimestamps = useRef<Record<string, number>>({});
  const deathRowRef = useRef<Record<string, number>>({});
  const isPinnedRef = useRef<Set<string>>(new Set());
  const activeTermsRef = useRef<Term[]>([]);
  const historicalTermIdsRef = useRef<Set<string>>(new Set());

  // Refs synchronization
  useEffect(() => { isPinnedRef.current = isPinned; }, [isPinned]);
  useEffect(() => { activeTermsRef.current = activeTerms; }, [activeTerms]);

  // Load pinned terms
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

  // Term extraction
  useEffect(() => {
    if (!transcript) return;
    const extracted = extractTerms(transcript, apiTerms);
    const now = Date.now();
    
    const completelyNewTerms = extracted.filter(t => !historicalTermIdsRef.current.has(t.id));
    if (completelyNewTerms.length === 0) return;

    completelyNewTerms.forEach(t => {
      historicalTermIdsRef.current.add(t.id);
      termTimestamps.current[t.id] = now;
    });

    setActiveTerms(prev => [...prev, ...completelyNewTerms]);
  }, [transcript, apiTerms]);

  // Bubble lifecycle management
  useEffect(() => {
    const id = setInterval(() => {
      const current = activeTermsRef.current;
      if (current.length <= 20) {
        deathRowRef.current = {};
        return;
      }

      const ts = termTimestamps.current;
      const deathRow = deathRowRef.current;
      const now = Date.now();

      let terms = [...current];
      terms.sort((a, b) => (ts[a.id] ?? 0) - (ts[b.id] ?? 0));

      if (terms.length > 30) {
        const excess = terms.length - 30;
        const toRemove = terms.splice(0, excess);
        toRemove.forEach(t => delete deathRow[t.id]);
      }

      if (terms.length > 20) {
        const excess = terms.length - 20;
        const oldestExcess = terms.slice(0, excess);
        const survivors = terms.slice(excess);

        survivors.forEach(t => delete deathRow[t.id]);

        let deletedAny = false;
        const finalTerms: Term[] = [];

        oldestExcess.forEach(t => {
          if (!deathRow[t.id]) deathRow[t.id] = now;
          const elapsed = now - deathRow[t.id];
          const lifetime = 5000;

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

      if (terms.length !== current.length) setActiveTerms(terms);
    }, 1000);

    return () => clearInterval(id);
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

  const handleTermClick = useCallback((term: Term) => {
    setSelectedTerm(term);
    if (isPinnedRef.current.has(term.id)) return;
    
    setTermWeights(prev => {
      const newWeight = (prev[term.id] || 0) + 1;
      if (newWeight === 5 && !isPinnedRef.current.has(term.id)) {
        handleTogglePin(term.id);
        toast.success(`「${term.word}」が重要ワードとしてピン留めされました`);
      }
      return { ...prev, [term.id]: newWeight };
    });
    
    setSearchHistory(prev => [term, ...prev.filter(t => t.id !== term.id)].slice(0, 50));
  }, [handleTogglePin]);

  const clearTermsAndHistory = useCallback(() => {
    setActiveTerms([]);
    setTermWeights({});
    setSelectedTerm(null);
    setIsPinned(new Set());
    termTimestamps.current = {};
    deathRowRef.current = {};
    historicalTermIdsRef.current = new Set();
  }, []);

  const termFrequencies = countTermFrequencies(transcript, activeTerms);

  return {
    activeTerms,
    selectedTerm, setSelectedTerm,
    termWeights,
    searchHistory, setSearchHistory,
    isPinned,
    pinnedTermsList,
    categoryFilter, setCategoryFilter,
    handleTermClick,
    handleTogglePin,
    clearTermsAndHistory,
    termFrequencies,
    // Provide refs for useTermVectors if necessary, or pass them in a cleaner way.
  };
}
