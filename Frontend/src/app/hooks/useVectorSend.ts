import { useRef, useCallback, useEffect } from 'react';
import { splitIntoSentences } from '../utils/sentenceSplit';
import {
  createVectorSendState,
  sendVectorRequest,
  type VectorPayload,
} from '../utils/vectorSendWithOverlap';

export interface UseVectorSendOptions {
  overlapSentences?: number;
  baseUrl?: string;
  intervalSec?: number;
  sendEveryNSentences?: number;
  onSent?: (payload: VectorPayload, result?: unknown) => void;
  onError?: (err: unknown) => void;
}

export function useVectorSend(
  transcript: string,
  options: UseVectorSendOptions = {}
) {
  const {
    overlapSentences = 2,
    baseUrl,
    sendEveryNSentences = 0,
    intervalSec = 0,
    onSent,
    onError,
  } = options;

  const stateRef = useRef(createVectorSendState({ overlapSentences }));

  const send = useCallback(async () => {
    const sentences = splitIntoSentences(transcript);
    if (sentences.length === 0) return;

    const state = stateRef.current;
    const payload = state.buildPayload(sentences);
    if (!payload || payload.sentences.length === 0) return;

    const url = baseUrl ?? '';
    try {
      const result = await sendVectorRequest(payload, url);
      onSent?.(payload, result);
    } catch (err: unknown) {
      onError?.(err);
      state.setLastSentEndIndex(payload.startIndex);
    }
  }, [transcript, baseUrl, onSent, onError]);

  useEffect(() => {
    if (intervalSec > 0) {
      const id = setInterval(send, intervalSec * 1000);
      return () => clearInterval(id);
    }
  }, [intervalSec, send]);

  useEffect(() => {
    if (sendEveryNSentences <= 0) return;
    const sentences = splitIntoSentences(transcript);
    const state = stateRef.current;
    const currentEnd = state.getLastSentEndIndex();
    const newCount = sentences.length - currentEnd;
    if (newCount >= sendEveryNSentences) send();
  }, [transcript, sendEveryNSentences, send]);

  useEffect(() => {
    if (!transcript?.trim()) stateRef.current.reset();
  }, [transcript]);

  return { send };
}
