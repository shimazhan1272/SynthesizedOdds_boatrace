import React, { useState } from 'react';
import { Copy, Check, Calculator, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { SyntheticOddsSummary } from '../types/boatrace';

interface Props {
  summary: SyntheticOddsSummary;
  budget: number;
  onBudgetChange: (val: number) => void;
  selectedCombinations: string[];
}

export const SyntheticOddsCard: React.FC<Props> = ({
  summary,
  budget,
  onBudgetChange,
  selectedCombinations,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAllocationTable, setShowAllocationTable] = useState(false);

  const handleCopy = () => {
    if (selectedCombinations.length === 0) return;
    const text = selectedCombinations.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBudgetInsufficient = budget < summary.betCount * 100;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-850 border border-cyan-800/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>合成オッズ＆購入配分</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                選択 {summary.betCount} 点
              </span>
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={summary.betCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-40 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">コピー完了</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>選択買い目をコピー</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Row: Synthetic Odds, Model Hit Prob, Implied Odds Prob */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Synthetic Odds */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 mb-1">合成オッズ</span>
          <span className="font-mono text-2xl font-black text-amber-300">
            {summary.syntheticOdds > 0 ? `${summary.syntheticOdds.toFixed(2)}倍` : 'ー'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            1 / Σ(1 / オッズ)
          </span>
        </div>

        {/* Model Estimated Prob */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 mb-1">的中確率（モデル推定）</span>
          <span className="font-mono text-2xl font-black text-cyan-300">
            {summary.modelHitProb > 0
              ? `${(summary.modelHitProb * 100).toFixed(1)}%`
              : 'ー'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            選択買い目の推定確率合算
          </span>
        </div>

        {/* Odds Implied Prob */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 mb-1">的中確率（オッズ換算）</span>
          <span className="font-mono text-2xl font-black text-slate-200">
            {summary.impliedOddsHitProb > 0
              ? `${(summary.impliedOddsHitProb * 100).toFixed(1)}%`
              : 'ー'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            払戻率75%基準
          </span>
        </div>
      </div>

      {/* Budget & Allocation Control */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            <span>購入予算（円）</span>
          </label>
          <div className="flex items-center gap-2">
            {[1000, 3000, 5000, 10000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onBudgetChange(preset)}
                className={`text-xs px-2 py-1 rounded-lg border font-mono transition ${
                  budget === preset
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ¥{preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min={100}
              step={100}
              value={budget}
              onChange={(e) => onBudgetChange(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold font-mono text-white focus:outline-none focus:border-cyan-500"
              placeholder="1000"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400">
              円
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAllocationTable(!showAllocationTable)}
            disabled={summary.betCount === 0}
            className="px-3.5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {showAllocationTable ? '配分表を閉じる' : '配分表を確認'}
          </button>
        </div>

        {/* Insufficient budget warning */}
        {isBudgetInsufficient && summary.betCount > 0 && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              予算が足りません（{summary.betCount}点 × 最低100円 ＝ 最低
              {(summary.betCount * 100).toLocaleString()}円必要）
            </span>
          </div>
        )}

        {/* Allocation Summary stats */}
        {summary.betCount > 0 && (
          <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 font-mono">
            <span>
              購入合計:{' '}
              <strong className="text-white">
                ¥{summary.totalCost.toLocaleString()}
              </strong>{' '}
              {summary.allocationError !== 0 && (
                <span className="text-slate-500 text-[11px]">
                  (丸め差: {summary.allocationError > 0 ? `+` : ''}
                  ¥{summary.allocationError.toLocaleString()})
                </span>
              )}
            </span>
            <span>
              的中時払戻:{' '}
              <strong className="text-amber-300">
                ¥{summary.minReturn.toLocaleString()} 〜 ¥
                {summary.maxReturn.toLocaleString()}
              </strong>
            </span>
          </div>
        )}

        {/* Detailed Stake Allocation Table */}
        {showAllocationTable && summary.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 sticky top-0 font-medium">
                <tr>
                  <th className="py-2 px-2.5">買い目</th>
                  <th className="py-2 px-2 text-right">オッズ</th>
                  <th className="py-2 px-2 text-right">配分比率</th>
                  <th className="py-2 px-2.5 text-right">購入額 (100円単位)</th>
                  <th className="py-2 px-2.5 text-right">的中時払戻</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {summary.rows.map((row) => (
                  <tr key={row.combination} className="hover:bg-slate-900/50">
                    <td className="py-1.5 px-2.5 font-bold text-white">
                      {row.combination}
                    </td>
                    <td className="py-1.5 px-2 text-right text-amber-300">
                      {row.odds.toFixed(1)}倍
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-400">
                      {(row.weight * 100).toFixed(1)}%
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-cyan-300">
                      ¥{row.amount.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-bold text-emerald-400">
                      ¥{row.expectedReturn.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
