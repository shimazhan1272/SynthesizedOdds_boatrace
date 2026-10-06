import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Calculator,
  Layers,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { PredictionResult, TrifectaOddsMap } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';
import { calcStakeAllocation } from '../utils/odds';

interface Props {
  prediction: PredictionResult;
  oddsMap?: TrifectaOddsMap;
  updateTime?: string;
  isLoadingOdds?: boolean;
  onRefreshOdds?: () => void;
  stadiumId?: number;
  raceNumber?: number;
  date?: string; // YYYYMMDD
  onPasteHtml?: (html: string) => void;
  budget?: number;
  onBudgetChange?: (budget: number) => void;
}

export const PredictionBets: React.FC<Props> = ({
  prediction,
  oddsMap,
  updateTime = '',
  isLoadingOdds = false,
  onRefreshOdds,
  stadiumId = 1,
  raceNumber = 1,
  date = '',
  onPasteHtml,
  budget = 1000,
  onBudgetChange,
}) => {
  const { trifectaBets, trifectaFormations, exactaBets, trioBets } = prediction;

  // Local budget state and string input state for free editing and clearing
  const [localBudget, setLocalBudget] = useState<number>(budget);
  const [budgetString, setBudgetString] = useState<string>(String(budget));

  useEffect(() => {
    setLocalBudget(budget);
    setBudgetString(String(budget));
  }, [budget]);

  // Set of user-selected combinations (default: all recommended combinations)
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set());

  // Whenever trifectaBets changes, select all recommended combinations by default
  useEffect(() => {
    setSelectedCombinations(new Set(trifectaBets.map((b) => b.combination)));
  }, [trifectaBets]);

  const toggleBetSelection = (comb: string) => {
    setSelectedCombinations((prev) => {
      const next = new Set(prev);
      if (next.has(comb)) {
        next.delete(comb);
      } else {
        next.add(comb);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedCombinations(new Set(trifectaBets.map((b) => b.combination)));
  };

  const handleDeselectAll = () => {
    setSelectedCombinations(new Set());
  };

  // Only the combinations chosen by the user
  const activeCombinations = useMemo(() => {
    return trifectaBets
      .map((b) => b.combination)
      .filter((comb) => selectedCombinations.has(comb));
  }, [trifectaBets, selectedCombinations]);

  const handleInputChange = (raw: string) => {
    setBudgetString(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setLocalBudget(parsed);
      onBudgetChange?.(parsed);
    } else if (raw === '' || parsed === 0) {
      setLocalBudget(0);
      onBudgetChange?.(0);
    }
  };

  const handleClearBudget = () => {
    setBudgetString('');
    setLocalBudget(0);
    onBudgetChange?.(0);
  };

  const handleInputBlur = () => {
    if (budgetString === '' || budgetString === '0') {
      return;
    }
    const parsed = parseInt(budgetString, 10);
    const minVal = 100;
    if (isNaN(parsed) || parsed < minVal) {
      const fallback = Math.max(minVal, 1000);
      setBudgetString(String(fallback));
      setLocalBudget(fallback);
      onBudgetChange?.(fallback);
    } else {
      setBudgetString(String(parsed));
      setLocalBudget(parsed);
      onBudgetChange?.(parsed);
    }
  };

  const handleQuickBudgetChange = (newVal: number) => {
    const minVal = 100;
    const valid = Math.max(minVal, newVal);
    setBudgetString(String(valid));
    setLocalBudget(valid);
    onBudgetChange?.(valid);
  };

  // 15 seconds cooldown timer for odds refresh
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [showPasteArea, setShowPasteArea] = useState<boolean>(false);
  const [pastedHtml, setPastedHtml] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSec((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleRefreshClick = () => {
    if (cooldownSec > 0 || isLoadingOdds || !onRefreshOdds) return;
    setCooldownSec(15);
    onRefreshOdds();
  };

  // Stake allocation and synthetic odds computed ONLY for user's selected combinations!
  const allocationSummary = useMemo(() => {
    return calcStakeAllocation(activeCombinations, oddsMap || {}, localBudget);
  }, [activeCombinations, oddsMap, localBudget]);

  // Lookup map of allocated row for fast O(1) matching
  const allocationRowMap = useMemo(() => {
    const map = new Map<string, typeof allocationSummary.rows[0]>();
    for (const r of allocationSummary.rows) {
      map.set(r.combination, r);
    }
    return map;
  }, [allocationSummary.rows]);

  // Render a compact boat badge with official boat color
  const renderBoatBadge = (bNum: number) => {
    const color = BOAT_COLORS[bNum] || BOAT_COLORS[1];
    return (
      <span
        key={bNum}
        className={`inline-flex items-center justify-center w-5 h-5 rounded font-black text-xs border ${color.bgColor} ${color.textColor} ${color.borderColor} shadow-xs`}
      >
        {bNum}
      </span>
    );
  };

  // Render combination visual (e.g. 1-2-4)
  const renderCombinationBadge = (comb: string) => {
    const boats = comb.split('-').map(Number);
    if (boats.length !== 3) {
      return <span className="font-mono font-bold text-white">{comb}</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {renderBoatBadge(boats[0])}
        <span className="text-slate-500 font-bold text-xs">-</span>
        {renderBoatBadge(boats[1])}
        <span className="text-slate-500 font-bold text-xs">-</span>
        {renderBoatBadge(boats[2])}
      </div>
    );
  };

  // Estimate target payout for selected bets
  const approxPayout = useMemo(() => {
    if (!allocationSummary || allocationSummary.rows.length === 0) return 0;
    const validRows = allocationSummary.rows.filter((r) => r.expectedReturn > 0);
    if (validRows.length === 0) return 0;
    const avg =
      validRows.reduce((sum, r) => sum + r.expectedReturn, 0) / validRows.length;
    return Math.round(avg);
  }, [allocationSummary]);

  // Copy betting table to clipboard (selected bets only)
  const handleCopyBets = () => {
    if (!allocationSummary || allocationSummary.rows.length === 0) return;

    const lines = [
      `【ボートレースAI推奨配分（3連単）】`,
      `選択点数: ${activeCombinations.length}点 (全${trifectaBets.length}点中) / 合成オッズ: ${
        allocationSummary.syntheticOdds > 0 ? `${allocationSummary.syntheticOdds.toFixed(2)}倍` : '未取得'
      }`,
      `合計購入額: ${allocationSummary.totalCost.toLocaleString()}円 (目標配当: 約${approxPayout.toLocaleString()}円)`,
      `--------------------`,
      ...allocationSummary.rows.map((r) => {
        const oddsStr = r.odds > 0 ? `${r.odds.toFixed(1)}倍` : 'オッズ未取得';
        const returnStr =
          r.expectedReturn > 0 ? `→ 払戻 約${r.expectedReturn.toLocaleString()}円` : '';
        return `${r.combination}: ${r.amount.toLocaleString()}円 (${oddsStr} ${returnStr})`;
      }),
      `--------------------`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const officialOddsUrl = `https://www.boatrace.jp/owpc/pc/race/odds3t?rno=${raceNumber}&jcd=${String(
    stadiumId
  ).padStart(2, '0')}&hd=${date}`;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-5">
      {/* 1. Header with Title, Selected Synthetic Odds Badge, and Odds Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">
                AI推奨買い目
              </h2>
              {/* Synthetic odds for USER-SELECTED bets */}
              {allocationSummary.syntheticOdds > 0 ? (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-600/80 text-amber-300 font-bold font-mono shadow-sm flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-400 font-sans font-medium">
                    選択合成オッズ:
                  </span>
                  <span className="text-amber-200 text-sm font-mono">
                    {allocationSummary.syntheticOdds.toFixed(2)}倍
                  </span>
                  <span className="text-[10px] text-amber-300/80 font-sans font-normal ml-0.5">
                    ({activeCombinations.length}点選択)
                  </span>
                </span>
              ) : activeCombinations.length === 0 ? (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-sans">
                  買い目をチェックして選択してください
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              3連単 {trifectaBets.length}点推奨（選択: {activeCombinations.length}点）
              {updateTime ? (
                <span className="ml-2 font-mono text-emerald-400">
                  （オッズ: {updateTime}）
                </span>
              ) : (
                <span className="ml-2 text-slate-500">
                  （オッズ未取得: 「オッズ更新」で最新オッズを反映）
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls: Refresh Odds, Paste HTML, Official Odds Link */}
        <div className="flex items-center gap-2 flex-wrap">
          {onRefreshOdds && (
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={cooldownSec > 0 || isLoadingOdds}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-md active:scale-95"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingOdds ? 'animate-spin' : ''}`}
              />
              <span>
                {isLoadingOdds
                  ? 'オッズ取得中...'
                  : cooldownSec > 0
                  ? `オッズ更新 (${cooldownSec}s)`
                  : 'オッズ更新'}
              </span>
            </button>
          )}

          {onPasteHtml && (
            <button
              type="button"
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title="公式サイトのオッズ表HTMLを手動貼付"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>HTML貼付</span>
            </button>
          )}

          {date && (
            <a
              href={officialOddsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-cyan-400 border border-slate-700 text-xs font-semibold transition"
              title="公式オッズページを開く"
            >
              <span>公式オッズ</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* HTML Manual Paste Fallback */}
      {showPasteArea && onPasteHtml && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              公式3連単オッズHTMLソース貼り付け
            </span>
            <span className="text-[11px] text-slate-500">
              ※CORS制限時や手動即時反映用
            </span>
          </div>
          <textarea
            rows={3}
            value={pastedHtml}
            onChange={(e) => setPastedHtml(e.target.value)}
            placeholder="<html><body>... 公式サイトのオッズ表HTMLソースを貼り付け ...</body></html>"
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
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
            >
              解析して反映
            </button>
          </div>
        </div>
      )}

      {/* 2. Budget Input & Allocation Settings */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">
              購入金額（任意入力）
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            ※選択された買い目のオッズに合わせて、どの目が的中してもおおよそ均等の配当になるよう100円単位で配分します
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Numeric Budget Input */}
          <div className="relative flex items-center">
            <input
              type="number"
              min={100}
              step={100}
              placeholder="0"
              value={budgetString}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              className="w-32 bg-slate-950 border border-cyan-600/70 rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-right pr-8 shadow-inner"
            />
            <span className="absolute right-2.5 text-xs text-slate-400 font-bold pointer-events-none">
              円
            </span>
          </div>

          {/* Clear Button (金額消去ボタン) */}
          <button
            type="button"
            onClick={handleClearBudget}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-800 text-xs font-bold text-slate-300 hover:text-rose-300 transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
            title="購入金額を消去"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>クリア</span>
          </button>

          {/* Stepper buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleQuickBudgetChange(localBudget - 1000)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              -1,000円
            </button>
            <button
              type="button"
              onClick={() => handleQuickBudgetChange(localBudget + 1000)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              +1,000円
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {[1000, 2000, 3000, 5000, 10000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuickBudgetChange(preset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  localBudget === preset
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                {preset.toLocaleString()}円
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Cards for USER-SELECTED bets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
          <span className="text-[11px] text-slate-400 block">選択買い目</span>
          <span className="text-base font-bold text-white font-mono">
            {activeCombinations.length}点 <span className="text-xs text-slate-500 font-normal">/ 全{trifectaBets.length}点</span>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
          <span className="text-[11px] text-amber-400/90 block font-semibold">選択合成オッズ</span>
          <span className="text-base font-bold text-amber-300 font-mono">
            {allocationSummary.syntheticOdds > 0
              ? `${allocationSummary.syntheticOdds.toFixed(2)}倍`
              : 'ー'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
          <span className="text-[11px] text-slate-400 block">合計購入金額</span>
          <span className="text-base font-bold text-cyan-300 font-mono">
            {allocationSummary.totalCost > 0 ? `${allocationSummary.totalCost.toLocaleString()}円` : '0円'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 text-center">
          <span className="text-[11px] text-emerald-400/90 block font-semibold">
            予想払戻（目標配当）
          </span>
          <span className="text-base font-bold text-emerald-400 font-mono">
            {approxPayout > 0 ? `約 ${approxPayout.toLocaleString()}円` : 'ー'}
          </span>
        </div>
      </div>

      {/* 4. Bets Display List with Checkbox Toggle and Equal Payout Stake Allocation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-bold">
              3連単 買い目選択・配分
            </span>
            <span className="text-[11px] text-cyan-400 font-mono font-semibold">
              （{activeCombinations.length}/{trifectaBets.length}点 選択中）
            </span>
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
              >
                全選択
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
              >
                全解除
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyBets}
            disabled={activeCombinations.length === 0}
            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">コピー完了!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>選択した買い目と金額をコピー</span>
              </>
            )}
          </button>
        </div>

        {/* Table / Rows */}
        <div className="space-y-1.5">
          {trifectaBets.map((bet, idx) => {
            const isSelected = selectedCombinations.has(bet.combination);
            const row = isSelected ? allocationRowMap.get(bet.combination) : undefined;
            const odds = oddsMap ? oddsMap[bet.combination] : 0;
            const hasRowOdds = odds > 0;

            return (
              <div
                key={bet.combination + idx}
                onClick={() => toggleBetSelection(bet.combination)}
                className={`cursor-pointer rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 sm:gap-4 transition border ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-50 hover:opacity-75'
                }`}
              >
                {/* Checkbox and Combination */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-xs'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-slate-500 font-mono text-xs w-4">
                    {idx + 1}
                  </span>
                  {renderCombinationBadge(bet.combination)}
                </div>

                {/* Numbers: Odds, Stake, Expected Payout */}
                <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-end">
                  {/* オッズ */}
                  <div className="text-right min-w-[65px]">
                    <span className="text-[10px] text-slate-400 block font-sans">
                      オッズ
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isSelected ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      {hasRowOdds ? `${odds.toFixed(1)}倍` : '未取得'}
                    </span>
                  </div>

                  {/* 購入金額 (Allocated stake for selected bets) */}
                  <div
                    className={`text-right min-w-[75px] px-2.5 py-1 rounded-lg border ${
                      isSelected
                        ? 'bg-slate-950/90 border-cyan-800/80'
                        : 'bg-slate-950/40 border-slate-800/40'
                    }`}
                  >
                    <span className="text-[10px] text-cyan-400/90 block font-sans font-medium">
                      購入金額
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        isSelected ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {isSelected && row ? `${row.amount.toLocaleString()}円` : '未選択'}
                    </span>
                  </div>

                  {/* 予想払戻金 (Expected payout) */}
                  <div
                    className={`text-right min-w-[85px] px-2.5 py-1 rounded-lg border ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-900/60'
                        : 'bg-slate-950/40 border-slate-800/40'
                    }`}
                  >
                    <span className="text-[10px] text-emerald-400 block font-sans font-medium">
                      予想配当
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        isSelected && row && row.expectedReturn > 0
                          ? 'text-emerald-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {isSelected && row && row.expectedReturn > 0
                        ? `${row.expectedReturn.toLocaleString()}円`
                        : 'ー'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Formation Summary Hint if applicable */}
        {trifectaFormations.length > 0 && (
          <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>参考フォーメーション:</span>
              <span className="font-mono text-slate-300 font-bold">
                {trifectaFormations.map((f) => f.formationText).join(' / ')}
              </span>
            </span>
            <span>（全 {trifectaBets.length}点）</span>
          </div>
        )}
      </div>

      {/* 5. Exacta (2連単) and Trio (3連複) clean display if enabled */}
      {(exactaBets.length > 0 || trioBets.length > 0) && (
        <div className="border-t border-slate-700/60 pt-4 space-y-3">
          {exactaBets.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                2連単（{exactaBets.length}点）
              </span>
              <div className="flex flex-wrap gap-2">
                {exactaBets.map((bet) => (
                  <div
                    key={bet.combination}
                    className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-mono"
                  >
                    {renderBoatBadge(bet.boats[0])}
                    <span className="text-slate-500 font-bold">-</span>
                    {renderBoatBadge(bet.boats[1])}
                  </div>
                ))}
              </div>
            </div>
          )}

          {trioBets.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                3連複（{trioBets.length}点）
              </span>
              <div className="flex flex-wrap gap-2">
                {trioBets.map((bet) => (
                  <div
                    key={bet.combination}
                    className="bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-mono"
                  >
                    {renderBoatBadge(bet.boats[0])}
                    <span className="text-slate-500 font-bold">=</span>
                    {renderBoatBadge(bet.boats[1])}
                    <span className="text-slate-500 font-bold">=</span>
                    {renderBoatBadge(bet.boats[2])}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
