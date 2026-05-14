import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Moon, Sun, Palette, SlidersHorizontal, Loader2, Mic, Type } from 'lucide-react';
import { useTranscription } from '../../presentation/hooks/useTranscription';
import type { TranscriptionMode } from '../../domain/interfaces/ITranscriptionService';
import {
  CONTENT_FONT_SCALE_MAX,
  CONTENT_FONT_SCALE_MIN,
  useContentFontScaleStore,
} from '../../stores/contentFontScaleStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    darkMode: boolean;
    themeColor: string;
  };
  updateSettings: (newSettings: any) => void;
  /** 類似度フィルター ON/OFF */
  similarityFilterEnabled?: boolean;
  onSimilarityFilterEnabledChange?: (enabled: boolean) => void;
  /** フィルターの強さ 0〜100 */
  similarityFilterStrength?: number;
  onSimilarityFilterStrengthChange?: (value: number) => void;
  /** 基準語（一覧表示用） */
  similarityReferenceWord?: string;
  /** APIから基準ベクトルを取得できたか */
  similarityReady?: boolean;
}

const THEME_COLORS = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-500' },
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  updateSettings,
  similarityFilterEnabled = false,
  onSimilarityFilterEnabledChange,
  similarityFilterStrength = 8,
  onSimilarityFilterStrengthChange,
  similarityReferenceWord = 'it',
  similarityReady = false,
}) => {
  const { mode, setMode, microphones, selectedMicrophoneId, selectMicrophone, refreshMicrophones } = useTranscription();
  const contentFontScale = useContentFontScaleStore(s => s.scale);
  const setContentFontScale = useContentFontScaleStore(s => s.setScale);

  if (!isOpen) return null;

  const dk = settings.darkMode;

  const modeBtn = (val: TranscriptionMode, label: string) => (
    <button
      key={val}
      onClick={() => setMode(val)}
      className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-colors ${
        mode === val
          ? dk
            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
            : 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : dk
            ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 ${dk ? 'bg-black/60' : 'bg-slate-900/50'} backdrop-blur-sm`}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${dk ? 'bg-[#12132a] border-slate-800/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-indigo-400" />
                <h2 className="text-base font-black">設定</h2>
              </div>
              <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">

              {/* Display Settings */}
              <section>
                <div className={`flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Palette size={12} /> 表示
                </div>

                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-bold">ダークモード</span>
                  <button
                    onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${settings.darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.darkMode ? 'left-[22px]' : 'left-0.5'} flex items-center justify-center shadow-sm`}>
                      {settings.darkMode ? <Moon size={8} className="text-indigo-600" /> : <Sun size={8} className="text-amber-500" />}
                    </div>
                  </button>
                </div>

                <div>
                  <span className="text-xs font-bold block mb-2">アクセントカラー</span>
                  <div className="flex gap-2">
                    {THEME_COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => updateSettings({ themeColor: color.value })}
                        className={`w-7 h-7 rounded-full transition-all ${color.bg} ${settings.themeColor === color.value ? `ring-2 ring-offset-2 ${dk ? 'ring-offset-[#12132a]' : 'ring-offset-white'} ring-slate-400 scale-110` : 'opacity-60 hover:opacity-100'}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <div className={`flex items-center gap-1.5 mb-2.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Type size={12} /> 用語の表示
                </div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">文字サイズ</span>
                  <span className={`text-[10px] font-mono font-bold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                    {Math.round(contentFontScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.round(CONTENT_FONT_SCALE_MIN * 100)}
                  max={Math.round(CONTENT_FONT_SCALE_MAX * 100)}
                  step={5}
                  value={Math.round(contentFontScale * 100)}
                  onChange={(e) => setContentFontScale(Number(e.target.value) / 100)}
                  className={`mb-1.5 w-full cursor-pointer accent-indigo-500 ${dk ? 'opacity-95' : ''}`}
                  aria-valuemin={Math.round(CONTENT_FONT_SCALE_MIN * 100)}
                  aria-valuemax={Math.round(CONTENT_FONT_SCALE_MAX * 100)}
                  aria-valuenow={Math.round(contentFontScale * 100)}
                  aria-label="用語と説明の文字サイズ"
                />
                <p className={`text-[10px] leading-snug ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  各ウィンドウ内の重要語・説明文のみ拡大／縮小します。ウィンドウタイトルやこの設定画面の文字サイズは変わりません。
                </p>
              </section>

              {/* 文字起こし（モード・マイク）— 操作ドックの詳細はここに集約 */}
              <section>
                <div className={`flex items-center gap-1.5 mb-2.5 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Mic size={12} /> 文字起こし
                </div>

                <div className="mb-3">
                  <span className="text-xs font-bold block mb-1.5">モード</span>
                  <div className="flex gap-2">
                    {modeBtn('fast', '速度重視')}
                    {modeBtn('accurate', '正確さ重視')}
                  </div>
                  <p className={`mt-1 text-[10px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                    {mode === 'fast' ? 'WebSpeechでリアルタイム寄り' : '停止後にローカルSTTで高精度化'}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">マイク</span>
                    <button
                      type="button"
                      onClick={() => void refreshMicrophones()}
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        dk
                          ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                      title="マイク一覧を再取得"
                    >
                      更新
                    </button>
                  </div>
                  <select
                    value={selectedMicrophoneId}
                    onChange={(e) => selectMicrophone(e.target.value)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                      dk ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    {microphones.length === 0 && <option value="">利用可能マイクなし</option>}
                    {microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>{mic.label}</option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Similarity Filter Settings */}
              {onSimilarityFilterEnabledChange && (
                <section>
                  <div className={`flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-widest ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                    <SlidersHorizontal size={12} /> 用語フィルター
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">&ldquo;{similarityReferenceWord}&rdquo; 類似度フィルター</span>
                      {!similarityReady && (
                        <span className={`flex items-center gap-1 text-[9px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Loader2 size={10} className="animate-spin" />準備中
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onSimilarityFilterEnabledChange(!similarityFilterEnabled)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${similarityFilterEnabled ? 'bg-indigo-600' : (dk ? 'bg-slate-700' : 'bg-slate-200')}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${similarityFilterEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {onSimilarityFilterStrengthChange && (
                    <div className={`mb-2 transition-opacity ${similarityFilterEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold">強さ</span>
                        <span className={`text-[10px] font-mono font-bold ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{similarityFilterStrength}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={similarityFilterStrength}
                        onChange={(e) => onSimilarityFilterStrengthChange(Number(e.target.value))}
                        className="w-full h-1 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-indigo-500"
                      />
                      <div className={`flex justify-between mt-0.5 text-[9px] ${dk ? 'text-slate-600' : 'text-slate-400'}`}>
                        <span>広く</span>
                        <span>絞る</span>
                      </div>
                    </div>
                  )}
                </section>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
