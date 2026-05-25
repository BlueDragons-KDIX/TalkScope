import React, { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Loader2, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  bulkRegisterDictionaryTerms,
  deleteDictionaryEntry,
  fetchDictionaryEntries,
  type DictionaryEntry,
  updateDictionaryEntry,
} from '@/app/utils/dictionaryApi';

interface DictionaryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DictionaryManagerModal: React.FC<DictionaryManagerModalProps> = ({
  isOpen,
  onClose,
  darkMode = true,
}) => {
  const dk = darkMode;
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [bulkInput, setBulkInput] = useState('');
  const [registering, setRegistering] = useState(false);

  const [editing, setEditing] = useState<DictionaryEntry | null>(null);
  const [editTerm, setEditTerm] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadEntries = useCallback(async (searchText: string) => {
    setLoading(true);
    try {
      const res = await fetchDictionaryEntries({
        q: searchText.trim() || undefined,
        limit: 200,
        offset: 0,
      });
      setEntries(res.items);
      setTotal(res.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`辞書一覧の取得に失敗しました: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadEntries(query);
  }, [isOpen, loadEntries]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await loadEntries(query);
  };

  const handleBulkRegister = async () => {
    const text = bulkInput.trim();
    if (!text) {
      toast.error('登録する単語を入力してください');
      return;
    }

    setRegistering(true);
    try {
      const res = await bulkRegisterDictionaryTerms(text);
      toast.success(`登録完了: 新規 ${res.created_count}件 / スキップ ${res.skipped_count}件`);
      setBulkInput('');
      await loadEntries(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`一括登録に失敗しました: ${message}`);
    } finally {
      setRegistering(false);
    }
  };

  const openEdit = (entry: DictionaryEntry) => {
    setEditing(entry);
    setEditTerm(entry.term);
    setEditDescription(entry.description);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditTerm('');
    setEditDescription('');
  };

  const saveEdit = async () => {
    if (!editing) return;

    const term = editTerm.trim();
    const description = editDescription.trim();
    if (!term || !description) {
      toast.error('単語と説明は必須です');
      return;
    }

    setSavingEdit(true);
    try {
      await updateDictionaryEntry(editing.id, {
        term,
        description,
      });
      toast.success(`「${term}」を更新しました`);
      closeEdit();
      await loadEntries(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`更新に失敗しました: ${message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const removeEntry = async (entry: DictionaryEntry) => {
    if (!window.confirm(`「${entry.term}」を削除しますか？`)) return;
    setDeletingId(entry.id);
    try {
      await deleteDictionaryEntry(entry.id);
      toast.success(`「${entry.term}」を削除しました`);
      await loadEntries(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`削除に失敗しました: ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className={`absolute inset-0 ${dk ? 'bg-black/70' : 'bg-slate-900/40'} backdrop-blur-sm`}
      />

      <div
        className={`relative z-[71] w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-2xl border shadow-2xl ${
          dk ? 'bg-[#111325] border-slate-800/70 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`px-5 py-4 border-b ${dk ? 'border-slate-800/70' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpenText size={16} className="text-indigo-400" />
              <h2 className="text-sm sm:text-base font-black">単語管理</h2>
              <span className={`text-[11px] font-mono ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
                total: {total}
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                dk ? 'hover:bg-slate-800 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400'
              }`}
              aria-label="閉じる"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(88vh-64px)]">
          <section className={`rounded-xl border p-3 ${dk ? 'border-slate-800/70 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
            <h3 className="text-xs font-black mb-2">一括登録</h3>
            <p className={`text-[11px] mb-2 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
              カンマまたは空白区切りで入力してください（例: `RAG MCP, ベクトルDB`）
            </p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={3}
              placeholder="登録したい単語を入力"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                dk
                  ? 'bg-[#0f1020] border-slate-700/70 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleBulkRegister}
                disabled={registering}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  dk
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                }`}
              >
                {registering ? <Loader2 size={13} className="animate-spin" /> : null}
                登録実行
              </button>
            </div>
          </section>

          <section className="space-y-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div
                className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  dk ? 'bg-slate-900/40 border-slate-800/70' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Search size={13} className={dk ? 'text-slate-500' : 'text-slate-400'} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="単語を検索"
                  className={`w-full bg-transparent outline-none text-sm ${
                    dk ? 'text-slate-200 placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>
              <button
                type="submit"
                className={`px-3 py-2 rounded-lg text-xs font-bold ${
                  dk ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                検索
              </button>
              <button
                type="button"
                onClick={() => void loadEntries(query)}
                className={`px-2.5 py-2 rounded-lg ${
                  dk ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                aria-label="再読み込み"
              >
                <RefreshCw size={14} />
              </button>
            </form>

            <div className={`rounded-xl border overflow-hidden ${dk ? 'border-slate-800/70' : 'border-slate-200'}`}>
              <div className="overflow-auto max-h-[42vh]">
                <table className="w-full text-sm">
                  <thead className={dk ? 'bg-slate-900/50' : 'bg-slate-100'}>
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-black whitespace-nowrap">単語</th>
                      <th className="text-left px-3 py-2 text-xs font-black">説明</th>
                      <th className="text-left px-3 py-2 text-xs font-black whitespace-nowrap">更新日</th>
                      <th className="text-right px-3 py-2 text-xs font-black whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-xs">
                          一覧を読み込み中...
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-xs">
                          登録された単語がありません
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className={dk ? 'border-t border-slate-800/60' : 'border-t border-slate-200'}>
                          <td className="px-3 py-2 font-bold whitespace-nowrap">{entry.term}</td>
                          <td className={`px-3 py-2 min-w-[280px] ${dk ? 'text-slate-300' : 'text-slate-700'}`}>
                            <p className="line-clamp-2">{entry.description}</p>
                          </td>
                          <td className={`px-3 py-2 text-xs whitespace-nowrap ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
                            {formatDate(entry.updated_at)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end items-center gap-1.5">
                              <button
                                onClick={() => openEdit(entry)}
                                className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                                  dk ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                }`}
                              >
                                <Pencil size={12} />
                                編集
                              </button>
                              <button
                                onClick={() => void removeEntry(entry)}
                                disabled={deletingId === entry.id}
                                className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                                  dk
                                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 disabled:opacity-50'
                                    : 'bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50'
                                }`}
                              >
                                {deletingId === entry.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeEdit}
          />
          <div
            className={`relative z-[81] w-full max-w-xl rounded-xl border p-4 ${
              dk ? 'bg-[#171a30] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className="text-sm font-black mb-3">単語を編集</h3>
            <div className="space-y-2">
              <div>
                <label className={`block text-xs font-bold mb-1 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                  単語
                </label>
                <input
                  value={editTerm}
                  onChange={(e) => setEditTerm(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                    dk ? 'bg-[#111325] border-slate-700 text-slate-100' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                  説明
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
                    dk ? 'bg-[#111325] border-slate-700 text-slate-100' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  dk ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                キャンセル
              </button>
              <button
                onClick={() => void saveEdit()}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingEdit ? <Loader2 size={12} className="animate-spin" /> : null}
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
