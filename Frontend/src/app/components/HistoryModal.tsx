import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Term } from '../data/terms';
import { X, History, Trash2, ChevronRight, Search } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: Term[];
  onTermClick: (term: Term) => void;
  onClearHistory: () => void;
  darkMode: boolean;
  themeColor: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onTermClick, 
  onClearHistory,
  darkMode,
}) => {
  if (!isOpen) return null;

  const dk = darkMode;

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
          initial={{ opacity: 0, scale: 0.95, x: 16 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 16 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-md h-[75vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${dk ? 'bg-[#12132a] border-slate-800/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
        >
          {/* Header */}
          <div className={`p-4 border-b ${dk ? 'border-slate-800/60' : 'border-slate-100'}`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-indigo-400" />
                <h2 className="text-lg font-black">検索履歴</h2>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={onClearHistory}
                  className={`p-1.5 rounded-lg transition-colors ${dk ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                  title="履歴を削除"
                >
                  <Trash2 size={14} />
                </button>
                <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${dk ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className={`relative flex items-center px-3 py-2 rounded-lg border ${dk ? 'bg-slate-900/50 border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}>
              <Search size={13} className={dk ? 'text-slate-600 mr-2' : 'text-slate-400 mr-2'} />
              <input 
                type="text" 
                placeholder="履歴から検索..." 
                className={`bg-transparent border-none outline-none text-xs flex-1 ${dk ? 'placeholder-slate-600' : 'placeholder-slate-400'}`}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3">
            {history.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
                <History size={32} className="mb-3 opacity-30" />
                <p className="text-xs font-bold opacity-60">履歴はまだありません</p>
                <p className="text-[10px] opacity-40 mt-1">調べた用語がここに保存されます</p>
              </div>
            ) : (
              <div className="space-y-1">
                {history.map((term, index) => (
                  <button
                    key={`${term.id}-${index}`}
                    onClick={() => onTermClick(term)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left border ${dk ? 'border-transparent bg-slate-900/30 hover:bg-slate-800/50 hover:border-indigo-500/20' : 'border-transparent bg-white hover:bg-slate-50 hover:border-indigo-200 shadow-sm'}`}
                  >
                    <div>
                      <h4 className="text-xs font-black">{term.word}</h4>
                      <p className={`text-[10px] truncate max-w-[220px] ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{term.shortDesc}</p>
                    </div>
                    <ChevronRight size={14} className={dk ? 'text-slate-600' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
