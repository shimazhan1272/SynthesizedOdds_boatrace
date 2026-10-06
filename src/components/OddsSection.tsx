import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  SlidersHorizontal,
  CheckSquare,
  Square,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BOAT_COLORS } from '../constants/boatrace';
import { BoatEntry, TrifectaOddsMap } from '../types/boatrace';
import { SyntheticOddsCard } from './SyntheticOddsCard';
import { calcStakeAllocation, parseOfficialOddsHtml } from '../utils/odds';

interface Props {
  stadiumId: number;
  raceNumber: number;
  date: string;
  boats: BoatEntry[];
  oddsMap: TrifectaOddsMap;
  updateTime: string;
  isLoadingOdds: boolean;
  onRefreshOdds: () => void;
  onPasteHtml: (html: string) => void;
  aiRecommendedCombinations: string[];
  modelProbMap: Map<string, number>;
  budget: number;
  onBudgetChange: (budget: number) => void;
}

export const OddsSection: React.FC<Props> = ({
  stadiumId,
  raceNumber,
  date,
  boats,
  oddsMap,
  updateTime,
  isLoadingOdds,
  onRefreshOdds,
  onPasteHtml,
  aiRecommendedCombinations,
  modelProbMap,
  budget,
  onBudgetChange,
}) => {
  // Selected 1st place boat tab (1 to 6)
  const [firstPlaceTab, setFirstPlaceTab] = useState<number>(1);
  // Set of selected combinations, e.g. "1-2-3"
  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());

  // Odds cooldown timer (15 seconds debounce to protect official server)
  const [cooldownSec, setCooldownSec] = useState<number>(0);

  // HTML Paste modal/accordion
  const [showPasteArea, setShowPasteArea] = useState<boolean>(false);
  const [pastedHtml, setPastedHtml] = useState<string>('');

  // Threshold select state
  const [thresholdVal, setThresholdVal] = useState<number>(10.0);
  const [thresholdMode, setThresholdMode] = useState<'gte' | 'lte'>('gte');

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSec((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSec]);

  const handleRefreshClick = () => {
    if (cooldownSec > 0 || isLoadingOdds) return;
    setCooldownSec(15);
    onRefreshOdds();
  };

  const toggleCombination = (comb: string) => {
    setSelectedCombos((prev) => {
      const next = new Set(prev);
      if (next.has(comb)) {
        next.delete(comb);
      } else {
        next.add(comb);
      }
      return next;
    });
  };

  // Helper: Select all AI recommended combinations
  const handleSelectAIRecommendations = () => {
    const next = new Set(selectedCombos);
    aiRecommendedCombinations.forEach((c) => {
      if (oddsMap[c] && oddsMap[c] > 0) {
        next.add(c);
      }
    });
    setSelectedCombos(next);
  };

  // Helper: Select all combinations for current 1st place boat
  const handleSelectCurrentFirst = () => {
    const next = new Set(selectedCombos);
    for (let b2 = 1; b2 <= 6; b2++) {
      if (b2 === firstPlaceTab) continue;
      for (let b3 = 1; b3 <= 6; b3++) {
        if (b3 === firstPlaceTab || b3 === b2) continue;
        const comb = `${firstPlaceTab}-${b2}-${b3}`;
        if (oddsMap[comb] && oddsMap[comb] > 0) {
          next.add(comb);
        }
      }
    }
    setSelectedCombos(next);
  };

  // Helper: Select by odds threshold
  const handleSelectByThreshold = () => {
    const next = new Set(selectedCombos);
    Object.entries(oddsMap).forEach(([comb, odds]) => {
      if (odds > 0) {
        if (thresholdMode === 'gte' && odds >= thresholdVal) {
          next.add(comb);
        } else if (thresholdMode === 'lte' && odds <= thresholdVal) {
          next.add(comb);
        }
      }
    });
    setSelectedCombos(next);
  };

  const handleClearAll = () => {
    setSelectedCombos(new Set());
  };

  // Stake allocation calculation
  const selectedList = Array.from(selectedCombos);
  const stakeSummary = calcStakeAllocation(
    selectedList,
    oddsMap,
    budget,
    modelProbMap
  );

  const hasAnyOdds = Object.keys(oddsMap).length > 0;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-5">
      {/* Header with update time and refresh button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>3連単オッズ・合成オッズ</span>
            {hasAnyOdds && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                120通り照会完了
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
            <span>
              更新状態: <strong className="text-white font-mono">{updateTime || 'ー'}</strong>
            </span>
            <a
              href={`https://www.boatrace.jp/owpc/pc/race/odds3t?rno=${raceNumber}&jcd=${String(stadiumId).padStart(2, '0')}&hd=${date}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline text-[11px]"
            >
              公式サイトオッズ元ページを開く ↗
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={cooldownSec > 0 || isLoadingOdds}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingOdds ? 'animate-spin' : ''}`}
            />
            <span>
              {isLoadingOdds
                ? '取得中...'
                : cooldownSec > 0
                ? `更新 (${cooldownSec}s)`
                : 'オッズ更新'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteArea(!showPasteArea)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>HTML手動貼付</span>
          </button>
        </div>
      </div>

      {/* Server protection & cache note */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <span>
          ※公式サイトへの負荷軽減のため、取得したオッズはメモリ内にキャッシュし、オッズ更新ボタンには15秒の間隔制限を設けています。
        </span>
      </div>

      {/* HTML Manual Paste accordion fallback */}
      {showPasteArea && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              公式サイトのHTMLソース貼り付け（フォールバック）
            </span>
            <span className="text-[11px] text-slate-500">
              ※CORS制限時や手動更新用
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            公式サイトのオッズページ（odds3t）のソースコードを貼り付けて「解析」を押すと、ブラウザ内で即座にオッズ表を展開します。
          </p>
          <textarea
            rows={4}
            value={pastedHtml}
            onChange={(e) => setPastedHtml(e.target.value)}
            placeholder="<html><body>... 公式サイトのオッズ表HTMLソースをここに貼り付け ...</body></html>"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (pastedHtml.trim()) {
                  onPasteHtml(pastedHtml);
                  setShowPasteArea(false);
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
            >
              解析して反映
            </button>
          </div>
        </div>
      )}

      {/* Synthetic Odds & Stake Distribution Card */}
      <SyntheticOddsCard
        summary={stakeSummary}
        budget={budget}
        onBudgetChange={onBudgetChange}
        selectedCombinations={selectedList}
      />

      {/* Batch selection helpers */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="text-xs font-semibold text-slate-400">
          一括選択補助
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAIRecommendations}
            className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 font-semibold transition"
          >
            ★ AI推奨買い目を選択
          </button>

          <button
            type="button"
            onClick={handleSelectCurrentFirst}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700 transition"
          >
            {firstPlaceTab}着固定（全20点）
          </button>

          {/* Threshold helper */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">オッズ</span>
            <input
              type="number"
              min={1}
              step={0.5}
              value={thresholdVal}
              onChange={(e) => setThresholdVal(Number(e.target.value))}
              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs"
            />
            <select
              value={thresholdMode}
              onChange={(e) => setThresholdMode(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-xs"
            >
              <option value="gte">倍以上</option>
              <option value="lte">倍以下</option>
            </select>
            <button
              type="button"
              onClick={handleSelectByThreshold}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium"
            >
              全選択
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="ml-auto px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-rose-400 border border-slate-700 transition font-medium"
          >
            選択全解除
          </button>
        </div>
      </div>

      {/* 1st Place Tab switcher */}
      <div>
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
          <span>1着固定ブロック（タブ切り替え）</span>
          <span className="text-[11px] text-slate-500">
            ※セルをタップして買い目を個別選択/解除
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((bNum) => {
            const colorDef = BOAT_COLORS[bNum] || BOAT_COLORS[1];
            const racer = boats[bNum - 1];
            const isActive = firstPlaceTab === bNum;

            return (
              <button
                key={bNum}
                type="button"
                onClick={() => setFirstPlaceTab(bNum)}
                className={`py-2 px-1 rounded-xl text-center border transition cursor-pointer flex flex-col items-center justify-center ${
                  isActive
                    ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded font-black text-xs inline-flex items-center justify-center border mb-1 ${colorDef.bgColor} ${colorDef.textColor} ${colorDef.borderColor}`}
                >
                  {bNum}
                </span>
                <span className="text-[11px] font-bold text-white truncate max-w-full">
                  {racer?.racerName || `${bNum}号艇`}
                </span>
                <span className="text-[10px] text-slate-400">1着</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2nd x 3rd Odds Matrix Table for currently selected 1st boat */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 overflow-x-auto">
        <div className="min-w-[480px]">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-2 text-left w-16">
                  2着 \ 3着
                </th>
                {[1, 2, 3, 4, 5, 6].map((b3) => {
                  if (b3 === firstPlaceTab) return null;
                  const c3 = BOAT_COLORS[b3];
                  return (
                    <th key={b3} className="py-2 px-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded font-black text-xs border ${c3.bgColor} ${c3.textColor} ${c3.borderColor}`}
                      >
                        {b3}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {[1, 2, 3, 4, 5, 6].map((b2) => {
                if (b2 === firstPlaceTab) return null;
                const c2 = BOAT_COLORS[b2];
                return (
                  <tr key={b2} className="hover:bg-slate-900/40">
                    <td className="py-2 px-2 text-left font-bold text-slate-300 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded font-black text-xs border ${c2.bgColor} ${c2.textColor} ${c2.borderColor}`}
                      >
                        {b2}
                      </span>
                      <span className="text-[11px] text-slate-400">2着</span>
                    </td>

                    {[1, 2, 3, 4, 5, 6].map((b3) => {
                      if (b3 === firstPlaceTab) return null;

                      if (b3 === b2) {
                        return (
                          <td
                            key={b3}
                            className="py-2 px-1 text-slate-700 bg-slate-900/20 text-[10px]"
                          >
                            ー
                          </td>
                        );
                      }

                      const comb = `${firstPlaceTab}-${b2}-${b3}`;
                      const odds = oddsMap[comb];
                      const isSelected = selectedCombos.has(comb);
                      const isValid = typeof odds === 'number' && odds > 0;

                      return (
                        <td key={b3} className="py-1 px-1">
                          <button
                            type="button"
                            disabled={!isValid}
                            onClick={() => toggleCombination(comb)}
                            className={`w-full py-1.5 px-1 rounded-lg border font-mono text-xs transition cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold ring-1 ring-cyan-500'
                                : isValid
                                ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500 text-slate-200'
                                : 'bg-slate-950 border-slate-850 text-slate-600 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 font-sans">
                              {b2}-{b3}
                            </span>
                            <span
                              className={`text-xs ${
                                isSelected
                                  ? 'text-amber-300 font-black'
                                  : isValid
                                  ? 'text-slate-100 font-bold'
                                  : 'text-slate-600'
                              }`}
                            >
                              {isValid ? odds.toFixed(1) : 'ー'}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
