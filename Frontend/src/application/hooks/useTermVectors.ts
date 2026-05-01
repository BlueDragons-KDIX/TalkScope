import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Term } from '@/domain/models/terms';
import { fetchThemeVector, type ThemeVectorResult } from '@/infrastructure/api/themeVectorApi';
import { cosineSimilarity, getMockThemeVector, MOCK_DIM } from '@/shared/utils/mockVectors';

export function useTermVectors(activeTerms: Term[], termVectors: Record<string, number[]>) {
  const [themeText, setThemeText] = useState('');
  const [themeVector, setThemeVector] = useState<ThemeVectorResult | null>(null);
  
  const [isSimilarityFilterEnabled, setIsSimilarityFilterEnabled] = useState(false);
  const [similarityFilterStrength, setSimilarityFilterStrength] = useState(8);
  
  const [itReferenceVector, setItReferenceVector] = useState<number[] | null>(() => getMockThemeVector(MOCK_DIM));
  const [isItReferenceReady, setIsItReferenceReady] = useState(false);
  const [wordVectors, setWordVectors] = useState<Record<string, number[]>>({});

  const fetchingWordSetRef = useRef<Set<string>>(new Set());
  const failedWordSetRef = useRef<Set<string>>(new Set());

  const normalizeWordKey = useCallback((word: string) => word.trim().toLowerCase(), []);

  // Theme text vector resolution
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

  // "it" reference vector resolution
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

  // Word-level fallback vector resolution for terms lacking IDs
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

  // Compute similarities
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

  const similarityThreshold = useMemo(() => {
    const s = Math.max(0, Math.min(100, similarityFilterStrength));
    if (s <= 50) {
      const a = -0.000095238095;
      const b = 0.01076190476;
      return -0.2 + a * s * s + b * s;
    }
    return 0.1 + ((s - 50) / 50) * 0.8;
  }, [similarityFilterStrength]);

  const clearVectors = useCallback(() => {
    setWordVectors({});
    fetchingWordSetRef.current.clear();
    failedWordSetRef.current.clear();
  }, []);

  return {
    themeText, setThemeText,
    themeVector, setThemeVector,
    isSimilarityFilterEnabled, setIsSimilarityFilterEnabled,
    similarityFilterStrength, setSimilarityFilterStrength,
    isItReferenceReady,
    termSimilarities,
    similarityThreshold,
    itReferenceVector,
    clearVectors
  };
}
