import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { checkVectorApi } from '@/app/utils/vectorApiCheck';

interface VectorApiCheckButtonProps {
  darkMode?: boolean;
  className?: string;
}

/** ベクトルAPI接続確認ボタン（SettingsModal を変更せずにチェックするためのUI） */
export const VectorApiCheckButton: React.FC<VectorApiCheckButtonProps> = ({
  darkMode = true,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await checkVectorApi();
    setLoading(false);
    if (result.ok) {
      toast.success(`ベクトルAPI接続OK（${result.url}）`);
    } else {
      toast.error(`ベクトルAPIエラー: ${result.error}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="ベクトルAPI接続確認"
      className={`p-1.5 rounded-lg transition-colors ${className} ${
        darkMode
          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800 disabled:opacity-40'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40'
      }`}
    >
      <Zap size={18} />
    </button>
  );
};
