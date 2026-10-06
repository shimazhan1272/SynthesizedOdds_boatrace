import React from 'react';
import { Anchor, Sparkles } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-900/30">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ボートレースAI予想
              </h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                合成オッズ
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>統計ロジットモデル（26万走解析）</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
