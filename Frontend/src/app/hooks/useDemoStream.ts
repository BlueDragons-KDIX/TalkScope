/**
 * useDemoStream.ts
 * デモ専用フック。コア機能（useSpeechRecognition 等）とは完全に独立しています。
 * DEMO_TEXT_STREAM をリアルタイム風に少しずつ更新する非同期ストリーミング機能。
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { DEMO_TEXT_STREAM, splitDemoIntoChunks } from '../demo/demo';

export type DemoStreamStatus = 'idle' | 'playing' | 'paused' | 'done';

interface UseDemoStreamOptions {
    /** チャンクを追記するコールバック（setTranscript を渡す） */
    onAppend: (text: string) => void;
    /** 1チャンクあたりの表示間隔 ms（動的変更対応） */
    intervalMs?: number;
}

export interface UseDemoStreamReturn {
    status: DemoStreamStatus;
    progress: number;        // 0–100 の進捗率
    intervalMs: number;      // 現在の速度設定
    setIntervalMs: (ms: number) => void;
    startStream: () => void;
    pauseStream: () => void;
    stopStream: () => void;
}

export const useDemoStream = ({
    onAppend,
    intervalMs: initialIntervalMs = 1542,
}: UseDemoStreamOptions): UseDemoStreamReturn => {
    const [status, setStatus] = useState<DemoStreamStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [intervalMs, setIntervalMs] = useState(initialIntervalMs);

    const chunksRef = useRef<string[]>([]);
    const indexRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const accRef = useRef('');
    const onAppendRef = useRef(onAppend);
    const intervalMsRef = useRef(intervalMs);

    // onAppend と intervalMs を ref に同期（再レンダリング不要な参照更新）
    useEffect(() => { onAppendRef.current = onAppend; }, [onAppend]);
    useEffect(() => { intervalMsRef.current = intervalMs; }, [intervalMs]);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // playing 中に intervalMs が変わったらインターバルを再起動
    useEffect(() => {
        if (status !== 'playing') return;
        clearTimer();
        timerRef.current = setInterval(() => {
            const chunks = chunksRef.current;
            const i = indexRef.current;
            if (i >= chunks.length) {
                clearTimer();
                setStatus('done');
                setProgress(100);
                return;
            }
            accRef.current += chunks[i];
            onAppendRef.current(accRef.current);
            indexRef.current = i + 1;
            setProgress(Math.round(((i + 1) / chunks.length) * 100));
        }, intervalMs);
        return clearTimer;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs, status]);

    const startStream = useCallback(() => {
        if (status === 'idle' || status === 'done') {
            chunksRef.current = splitDemoIntoChunks(DEMO_TEXT_STREAM);
            indexRef.current = 0;
            accRef.current = '';
            setProgress(0);
        }
        setStatus('playing');
    }, [status]);

    const pauseStream = useCallback(() => {
        clearTimer();
        setStatus('paused');
    }, [clearTimer]);

    const stopStream = useCallback(() => {
        clearTimer();
        chunksRef.current = [];
        indexRef.current = 0;
        accRef.current = '';
        setStatus('idle');
        setProgress(0);
    }, [clearTimer]);

    return { status, progress, intervalMs, setIntervalMs, startStream, pauseStream, stopStream };
};
