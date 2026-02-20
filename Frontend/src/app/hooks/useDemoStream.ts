/**
 * useDemoStream.ts
 * デモ専用フック。コア機能（useSpeechRecognition 等）とは完全に独立しています。
 * DEMO_TEXT_STREAM をリアルタイム風に少しずつ更新する非同期ストリーミング機能。
 */

import { useState, useRef, useCallback } from 'react';
import { DEMO_TEXT_STREAM, splitDemoIntoChunks } from '../demo/demo';

export type DemoStreamStatus = 'idle' | 'playing' | 'paused' | 'done';

interface UseDemoStreamOptions {
    /** チャンクを追記するコールバック（setTranscript を渡す） */
    onAppend: (text: string) => void;
    /** 1チャンクあたりの表示間隔 ms（デフォルト 250ms） */
    intervalMs?: number;
}

interface UseDemoStreamReturn {
    status: DemoStreamStatus;
    progress: number;        // 0–100 の進捗率
    startStream: () => void;
    pauseStream: () => void;
    stopStream: () => void;
}

export const useDemoStream = ({
    onAppend,
    intervalMs = 250,
}: UseDemoStreamOptions): UseDemoStreamReturn => {
    const [status, setStatus] = useState<DemoStreamStatus>('idle');
    const [progress, setProgress] = useState(0);

    const chunksRef = useRef<string[]>([]);
    const indexRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const accRef = useRef('');  // 蓄積テキスト

    const clearTimer = () => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startStream = useCallback(() => {
        // idle のときは最初から、paused のときは途中から再開
        if (status === 'idle' || status === 'done') {
            // 初期化
            chunksRef.current = splitDemoIntoChunks(DEMO_TEXT_STREAM);
            indexRef.current = 0;
            accRef.current = '';
            setProgress(0);
        }

        setStatus('playing');

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
            onAppend(accRef.current);
            indexRef.current = i + 1;
            setProgress(Math.round(((i + 1) / chunks.length) * 100));
        }, intervalMs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, intervalMs]);

    const pauseStream = useCallback(() => {
        clearTimer();
        setStatus('paused');
    }, []);

    const stopStream = useCallback(() => {
        clearTimer();
        chunksRef.current = [];
        indexRef.current = 0;
        accRef.current = '';
        setStatus('idle');
        setProgress(0);
    }, []);

    return { status, progress, startStream, pauseStream, stopStream };
};
