import React from 'react';
import { Term } from '../data/terms';
import { TermBubble } from './TermBubble';
import { Hexagon } from 'lucide-react';

interface BubbleCloudProps {
  activeTerms: Term[];
  termWeights: Record<string, number>;
  onTermClick: (term: Term) => void;
  userLevel: number;
  darkMode?: boolean;
}

export const BubbleCloud: React.FC<BubbleCloudProps> = ({ 
  activeTerms, 
  termWeights, 
  onTermClick,
  userLevel,
  darkMode = true,
}) => {
  const dk = darkMode;

  return (
    <div className={`relative w-full h-full flex flex-wrap items-center justify-center content-center overflow-auto p-6 rounded-xl border min-h-[400px] transition-colors ${dk ? 'bg-[#0d0e1a] border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Subtle grid background */}
      {dk && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {activeTerms.length === 0 ? (
        <div className={`text-center ${dk ? 'text-slate-600' : 'text-slate-300'}`}>
          <Hexagon className="mx-auto mb-3 opacity-30" size={40} />
          <p className="text-sm font-bold opacity-60">用語抽出待機中</p>
          <p className="text-[11px] opacity-40 mt-1">音声から検出された用語がここに表示されます</p>
        </div>
      ) : (
        activeTerms.map((term) => (
          <TermBubble
            key={term.id}
            term={term}
            weight={termWeights[term.id] || 0}
            onClick={onTermClick}
            userLevel={userLevel}
            darkMode={dk}
          />
        ))
      )}
    </div>
  );
};