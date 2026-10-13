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
  X,
  Layers3,
} from 'lucide-react';
import { PredictionResult, TrifectaOddsMap } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';
import {
  calcStakeAllocation,
  deriveExactaOddsFromTrifecta,
  deriveTrioOddsFromTrifecta,
} from '../utils/odds';

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

export interface CombinedBetItem {
  ticketType: 'trifecta' | 'exacta' | 'trio';
  typeLabel: string;
  combination: string;
  boats: number[];
  probability: number;
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

  // Active ticket type tab: 'all' (全券種まとめ) | 'trifecta' (3連単) | 'exacta' (2連単) | 'trio' (3連複)
  const [betType, setBetType] = useState<'all' | 'trifecta' | 'exacta' | 'trio'>('all');

  // Local budget state and string input state for free editing and clearing
  const [localBudget, setLocalBudget] = useState<number>(budget);
  const [budgetString, setBudgetString] = useState<string>(String(budget));

  useEffect(() => {
    setLocalBudget(budget);
    setBudgetString(String(budget));
  }, [budget]);

  // User-selected sets for each ticket type
  const [selectedTrifecta, setSelectedTrifecta] = useState<Set<string>>(new Set());
  const [selectedExacta, setSelectedExacta] = useState<Set<string>>(new Set());
  const [selectedTrio, setSelectedTrio] = useState<Set<string>>(new Set());

  // Default: select all recommended combinations whenever predictions update
  useEffect(() => {
    setSelectedTrifecta(new Set(trifectaBets.map((b) => b.combination)));
  }, [trifectaBets]);

  useEffect(() => {
    setSelectedExacta(new Set(exactaBets.map((b) => b.combination)));
  }, [exactaBets]);

  useEffect(() => {
    setSelectedTrio(new Set(trioBets.map((b) => b.combination)));
  }, [trioBets]);

  // Derived odds maps for 2連単 and 3連複 from 3連単 odds
  const exactaOddsMap = useMemo(() => {
    return deriveExactaOddsFromTrifecta(oddsMap || {});
  }, [oddsMap]);

  const trioOddsMap = useMemo(() => {
    return deriveTrioOddsFromTrifecta(oddsMap || {});
  }, [oddsMap]);

  // Unified merged odds map across 3連単, 2連単, and 3連複
  const mergedOddsMap: Record<string, number> = useMemo(() => {
    return {
      ...(oddsMap || {}),
      ...exactaOddsMap,
      ...trioOddsMap,
    };
  }, [oddsMap, exactaOddsMap, trioOddsMap]);

  // Active (user-checked) combinations for each type
  const trifectaActive = useMemo(() => {
    return trifectaBets
      .map((b) => b.combination)
      .filter((comb) => selectedTrifecta.has(comb));
  }, [trifectaBets, selectedTrifecta]);

  const exactaActive = useMemo(() => {
    return exactaBets
      .map((b) => b.combination)
      .filter((comb) => selectedExacta.has(comb));
  }, [exactaBets, selectedExacta]);

  const trioActive = useMemo(() => {
    return trioBets
      .map((b) => b.combination)
      .filter((comb) => selectedTrio.has(comb));
  }, [trioBets, selectedTrio]);

  // Combined active array (across all 3 ticket types)
  const combinedActive = useMemo(() => {
    return [...trifectaActive, ...exactaActive, ...trioActive];
  }, [trifectaActive, exactaActive, trioActive]);

  // Unified list of all recommended bets from all ticket types
  const allCombinedBets: CombinedBetItem[] = useMemo(() => {
    const list: CombinedBetItem[] = [];
    trifectaBets.forEach((b) => {
      list.push({
        ticketType: 'trifecta',
        typeLabel: '3連単',
        combination: b.combination,
        boats: b.boats,
        probability: b.probability,
      });
    });
    exactaBets.forEach((b) => {
      list.push({
        ticketType: 'exacta',
        typeLabel: '2連単',
        combination: b.combination,
        boats: b.boats,
        probability: b.probability,
      });
    });
    trioBets.forEach((b) => {
      list.push({
        ticketType: 'trio',
        typeLabel: '3連複',
        combination: b.combination,
        boats: b.boats,
        probability: b.probability,
      });
    });
    return list;
  }, [trifectaBets, exactaBets, trioBets]);

  // Allocations & Synthetic Odds for all four views
  const combinedAllocation = useMemo(() => {
    return calcStakeAllocation(combinedActive, mergedOddsMap, localBudget);
  }, [combinedActive, mergedOddsMap, localBudget]);

  const trifectaAllocation = useMemo(() => {
    return calcStakeAllocation(trifectaActive, oddsMap || {}, localBudget);
  }, [trifectaActive, oddsMap, localBudget]);

  const exactaAllocation = useMemo(() => {
    return calcStakeAllocation(exactaActive, exactaOddsMap, localBudget);
  }, [exactaActive, exactaOddsMap, localBudget]);

  const trioAllocation = useMemo(() => {
    return calcStakeAllocation(trioActive, trioOddsMap, localBudget);
  }, [trioActive, trioOddsMap, localBudget]);

  // Active view helpers
  const currentAllocation =
    betType === 'all'
      ? combinedAllocation
      : betType === 'trifecta'
      ? trifectaAllocation
      : betType === 'exacta'
      ? exactaAllocation
      : trioAllocation;

  const currentActiveCount =
    betType === 'all'
      ? combinedActive.length
      : betType === 'trifecta'
      ? trifectaActive.length
      : betType === 'exacta'
      ? exactaActive.length
      : trioActive.length;

  const currentTotalCount =
    betType === 'all'
      ? allCombinedBets.length
      : betType === 'trifecta'
      ? trifectaBets.length
      : betType === 'exacta'
      ? exactaBets.length
      : trioBets.length;

  const currentOddsMap =
    betType === 'all'
      ? mergedOddsMap
      : betType === 'trifecta'
      ? oddsMap || {}
      : betType === 'exacta'
      ? exactaOddsMap
      : trioOddsMap;

  // Toggle selection for any combination
  const toggleBetSelection = (comb: string, type?: 'trifecta' | 'exacta' | 'trio') => {
    const targetType =
      type ||
      (comb.includes('=')
        ? 'trio'
        : comb.split('-').length === 2
        ? 'exacta'
        : 'trifecta');

    if (targetType === 'trifecta') {
      setSelectedTrifecta((prev) => {
        const next = new Set(prev);
        if (next.has(comb)) next.delete(comb);
        else next.add(comb);
        return next;
      });
    } else if (targetType === 'exacta') {
      setSelectedExacta((prev) => {
        const next = new Set(prev);
        if (next.has(comb)) next.delete(comb);
        else next.add(comb);
        return next;
      });
    } else {
      setSelectedTrio((prev) => {
        const next = new Set(prev);
        if (next.has(comb)) next.delete(comb);
        else next.add(comb);
        return next;
      });
    }
  };

  const isCombSelected = (comb: string, type?: 'trifecta' | 'exacta' | 'trio') => {
    const targetType =
      type ||
      (comb.includes('=')
        ? 'trio'
        : comb.split('-').length === 2
        ? 'exacta'
        : 'trifecta');

    if (targetType === 'trifecta') return selectedTrifecta.has(comb);
    if (targetType === 'exacta') return selectedExacta.has(comb);
    return selectedTrio.has(comb);
  };

  const handleSelectAll = () => {
    if (betType === 'all') {
      setSelectedTrifecta(new Set(trifectaBets.map((b) => b.combination)));
      setSelectedExacta(new Set(exactaBets.map((b) => b.combination)));
      setSelectedTrio(new Set(trioBets.map((b) => b.combination)));
    } else if (betType === 'trifecta') {
      setSelectedTrifecta(new Set(trifectaBets.map((b) => b.combination)));
    } else if (betType === 'exacta') {
      setSelectedExacta(new Set(exactaBets.map((b) => b.combination)));
    } else {
      setSelectedTrio(new Set(trioBets.map((b) => b.combination)));
    }
  };

  const handleDeselectAll = () => {
    if (betType === 'all') {
      setSelectedTrifecta(new Set());
      setSelectedExacta(new Set());
      setSelectedTrio(new Set());
    } else if (betType === 'trifecta') {
      setSelectedTrifecta(new Set());
    } else if (betType === 'exacta') {
      setSelectedExacta(new Set());
    } else {
      setSelectedTrio(new Set());
    }
  };

  // Quick single-type selectors for "all" mode
  const handleSelectOnlyType = (target: 'trifecta' | 'exacta' | 'trio') => {
    setSelectedTrifecta(
      target === 'trifecta'
        ? new Set(trifectaBets.map((b) => b.combination))
        : new Set()
    );
    setSelectedExacta(
      target === 'exacta'
        ? new Set(exactaBets.map((b) => b.combination))
        : new Set()
    );
    setSelectedTrio(
      target === 'trio' ? new Set(trioBets.map((b) => b.combination)) : new Set()
    );
  };

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

  // Fast O(1) matching for current rows
  const allocationRowMap = useMemo(() => {
    const map = new Map<string, typeof currentAllocation.rows[0]>();
    for (const r of currentAllocation.rows) {
      map.set(r.combination, r);
    }
    return map;
  }, [currentAllocation.rows]);

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

  // Render combination visual (3連単 1-2-4 / 2連単 1-2 / 3連複 1=2=3)
  const renderCombinationBadge = (comb: string) => {
    if (comb.includes('=')) {
      // 3連複
      const boats = comb.split('=').map(Number);
      return (
        <div className="flex items-center gap-1 font-mono font-bold">
          {renderBoatBadge(boats[0])}
          <span className="text-amber-400 font-bold text-xs">=</span>
          {renderBoatBadge(boats[1])}
          <span className="text-amber-400 font-bold text-xs">=</span>
          {renderBoatBadge(boats[2])}
        </div>
      );
    }

    const boats = comb.split('-').map(Number);
    if (boats.length === 2) {
      // 2連単
      return (
        <div className="flex items-center gap-1 font-mono font-bold">
          {renderBoatBadge(boats[0])}
          <span className="text-slate-500 font-bold text-xs">-</span>
          {renderBoatBadge(boats[1])}
        </div>
      );
    }

    // 3連単
    return (
      <div className="flex items-center gap-1 font-mono font-bold">
        {renderBoatBadge(boats[0])}
        <span className="text-slate-500 font-bold text-xs">-</span>
        {renderBoatBadge(boats[1])}
        <span className="text-slate-500 font-bold text-xs">-</span>
        {renderBoatBadge(boats[2])}
      </div>
    );
  };

  // Render ticket type pill tag
  const renderTicketTypeBadge = (type: 'trifecta' | 'exacta' | 'trio') => {
    if (type === 'exacta') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800 shrink-0">
          2連単
        </span>
      );
    }
    if (type === 'trio') {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-800 shrink-0">
          3連複
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-800 shrink-0">
        3連単
      </span>
    );
  };

  // Copy betting table to clipboard (selected bets only, without payout display)
  const handleCopyBets = () => {
    if (!currentAllocation || currentAllocation.rows.length === 0) return;
    const typeLabel =
      betType === 'all'
        ? '全券種まとめ（3連単＋2連単＋3連複）'
        : betType === 'trifecta'
        ? '3連単'
        : betType === 'exacta'
        ? '2連単'
        : '3連複';

    const lines = [
      `【ボートレースAI推奨配分（${typeLabel}）】`,
      `選択点数: ${currentActiveCount}点 (全${currentTotalCount}点中) / 合成オッズ: ${
        currentAllocation.syntheticOdds > 0
          ? `${currentAllocation.syntheticOdds.toFixed(2)}倍`
          : '未取得'
      }`,
      `合計購入額: ${currentAllocation.totalCost.toLocaleString()}円`,
      `--------------------`,
      ...currentAllocation.rows.map((r) => {
        const oddsStr = r.odds > 0 ? `${r.odds.toFixed(1)}倍` : 'オッズ未取得';
        const tag = r.combination.includes('=')
          ? '[3連複]'
          : r.combination.split('-').length === 2
          ? '[2連単]'
          : '[3連単]';
        return `${tag} ${r.combination}: ${r.amount.toLocaleString()}円 (${oddsStr})`;
      }),
      `--------------------`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getOfficialOddsPath = () => {
    const jcd = String(stadiumId).padStart(2, '0');
    if (betType === 'exacta') {
      return `/owpc/pc/race/odds2tf?rno=${raceNumber}&jcd=${jcd}&hd=${date}`;
    }
    if (betType === 'trio') {
      return `/owpc/pc/race/odds3f?rno=${raceNumber}&jcd=${jcd}&hd=${date}`;
    }
    return `/owpc/pc/race/odds3t?rno=${raceNumber}&jcd=${jcd}&hd=${date}`;
  };

  const officialOddsUrl = `https://www.boatrace.jp${getOfficialOddsPath()}`;

  const currentTypeTitle =
    betType === 'all'
      ? '全券種（3連単＋2連単＋3連複）'
      : betType === 'trifecta'
      ? '3連単'
      : betType === 'exacta'
      ? '2連単'
      : '3連複';

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
              {/* Synthetic odds for current ticket type / combined */}
              {currentAllocation.syntheticOdds > 0 ? (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-600/80 text-amber-300 font-bold font-mono shadow-sm flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-400 font-sans font-medium">
                    {betType === 'all' ? '全体合成オッズ:' : `${currentTypeTitle} 合成オッズ:`}
                  </span>
                  <span className="text-amber-200 text-sm font-mono">
                    {currentAllocation.syntheticOdds.toFixed(2)}倍
                  </span>
                  <span className="text-[10px] text-amber-300/80 font-sans font-normal ml-0.5">
                    ({currentActiveCount}点選択)
                  </span>
                </span>
              ) : currentActiveCount === 0 ? (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-sans">
                  買い目をチェックして選択してください
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {betType === 'all'
                ? `全券種合計 ${allCombinedBets.length}点（選択: ${combinedActive.length}点：3連単${trifectaActive.length}点/2連単${exactaActive.length}点/3連複${trioActive.length}点）`
                : `${currentTypeTitle} ${currentTotalCount}点推奨（選択: ${currentActiveCount}点）`}
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

        {/* Action Controls: Refresh Odds, Paste HTML/URL, Official Odds Link */}
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
              title="公式サイトのオッズ表HTMLまたはURLを手動貼付"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>URL・HTML貼付</span>
            </button>
          )}

          {date && (
            <a
              href={officialOddsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-cyan-400 border border-slate-700 text-xs font-semibold transition"
              title={`${currentTypeTitle}の公式オッズページを開く`}
            >
              <span>公式オッズ</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* HTML or URL Manual Paste Fallback */}
      {showPasteArea && onPasteHtml && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              公式オッズのURLまたはHTMLソース貼り付け
            </span>
            <span className="text-[11px] text-slate-400">
              ※オッズURLをそのまま貼り付けても取得・解析できます
            </span>
          </div>
          <textarea
            rows={3}
            value={pastedHtml}
            onChange={(e) => setPastedHtml(e.target.value)}
            placeholder="https://www.boatrace.jp/owpc/pc/race/odds3t?rno=4&jcd=20&hd=20261006 または HTMLソースを貼り付け"
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

      {/* Ticket Type Tabs: 全券種まとめ / 3連単 / 2連単 / 3連複 */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl overflow-x-auto">
        {/* 全券種まとめ (Combined) */}
        <button
          type="button"
          onClick={() => setBetType('all')}
          className={`flex-1 min-w-[150px] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
            betType === 'all'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-md'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/80'
          }`}
        >
          <Layers3 className="w-3.5 h-3.5" />
          <span>全券種まとめ（{allCombinedBets.length}点）</span>
          {combinedAllocation.syntheticOdds > 0 ? (
            <span
              className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                betType === 'all'
                  ? 'bg-slate-950/80 text-amber-300 border border-amber-400/50'
                  : 'bg-slate-800 text-amber-300'
              }`}
            >
              合成 {combinedAllocation.syntheticOdds.toFixed(2)}倍
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">合成 ー</span>
          )}
        </button>

        {/* 3連単 */}
        <button
          type="button"
          onClick={() => setBetType('trifecta')}
          className={`flex-1 min-w-[125px] py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
            betType === 'trifecta'
              ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/80'
          }`}
        >
          <span>3連単（{trifectaBets.length}点）</span>
          {trifectaAllocation.syntheticOdds > 0 ? (
            <span
              className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                betType === 'trifecta'
                  ? 'bg-cyan-950/90 text-cyan-200 border border-cyan-400/40'
                  : 'bg-slate-800 text-amber-300'
              }`}
            >
              合成 {trifectaAllocation.syntheticOdds.toFixed(2)}倍
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">合成 ー</span>
          )}
        </button>

        {/* 2連単 */}
        <button
          type="button"
          onClick={() => setBetType('exacta')}
          className={`flex-1 min-w-[125px] py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
            betType === 'exacta'
              ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/80'
          }`}
        >
          <span>2連単（{exactaBets.length}点）</span>
          {exactaAllocation.syntheticOdds > 0 ? (
            <span
              className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                betType === 'exacta'
                  ? 'bg-cyan-950/90 text-cyan-200 border border-cyan-400/40'
                  : 'bg-slate-800 text-amber-300'
              }`}
            >
              合成 {exactaAllocation.syntheticOdds.toFixed(2)}倍
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">合成 ー</span>
          )}
        </button>

        {/* 3連複 */}
        <button
          type="button"
          onClick={() => setBetType('trio')}
          className={`flex-1 min-w-[125px] py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
            betType === 'trio'
              ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/80'
          }`}
        >
          <span>3連複（{trioBets.length}点）</span>
          {trioAllocation.syntheticOdds > 0 ? (
            <span
              className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                betType === 'trio'
                  ? 'bg-cyan-950/90 text-cyan-200 border border-cyan-400/40'
                  : 'bg-slate-800 text-amber-300'
              }`}
            >
              合成 {trioAllocation.syntheticOdds.toFixed(2)}倍
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">合成 ー</span>
          )}
        </button>
      </div>

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

      {/* 3. Summary KPI Cards for USER-SELECTED bets (Clean 3-column layout without payout card) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-center">
          <span className="text-[11px] text-slate-400 block mb-0.5">選択買い目</span>
          <span className="text-lg font-bold text-white font-mono">
            {currentActiveCount}点{' '}
            <span className="text-xs text-slate-500 font-normal">
              / 全{currentTotalCount}点
            </span>
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-center">
          <span className="text-[11px] text-amber-400/90 block font-semibold mb-0.5">
            {betType === 'all' ? '全体合成オッズ' : `${currentTypeTitle} 合成オッズ`}
          </span>
          <span className="text-lg font-bold text-amber-300 font-mono">
            {currentAllocation.syntheticOdds > 0
              ? `${currentAllocation.syntheticOdds.toFixed(2)}倍`
              : 'ー'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 text-center">
          <span className="text-[11px] text-cyan-400/90 block font-semibold mb-0.5">
            合計購入金額
          </span>
          <span className="text-lg font-bold text-cyan-300 font-mono">
            {currentAllocation.totalCost > 0
              ? `${currentAllocation.totalCost.toLocaleString()}円`
              : '0円'}
          </span>
        </div>
      </div>

      {/* 4. Bets Display List with Checkbox Toggle and Equal Payout Stake Allocation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap px-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-200 font-bold">
              {betType === 'all'
                ? '全券種 買い目選択・一括配分'
                : `${currentTypeTitle} 買い目選択・配分`}
            </span>
            <span className="text-[11px] text-cyan-400 font-mono font-semibold">
              （{currentActiveCount}/{currentTotalCount}点 選択中）
            </span>

            {/* Quick Filter & Selection Buttons */}
            <div className="flex items-center gap-1 ml-1 flex-wrap">
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
              {betType === 'all' && (
                <>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectOnlyType('trifecta')}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 text-cyan-400 text-[10px] font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    3連単のみ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectOnlyType('exacta')}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-blue-950 text-blue-400 text-[10px] font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    2連単のみ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectOnlyType('trio')}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-amber-950 text-amber-400 text-[10px] font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    3連複のみ
                  </button>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyBets}
            disabled={currentActiveCount === 0}
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

        {/* Bets Table */}
        <div className="space-y-1.5">
          {betType === 'all' ? (
            /* ALL TICKETS VIEW */
            allCombinedBets.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                推奨買い目がありません（上部の設定から買い目点数を指定してください）
              </div>
            ) : (
              allCombinedBets.map((item, idx) => {
                const isSelected = isCombSelected(item.combination, item.ticketType);
                const row = isSelected ? allocationRowMap.get(item.combination) : undefined;
                const odds = mergedOddsMap ? mergedOddsMap[item.combination] : 0;
                const hasRowOdds = odds > 0;

                return (
                  <div
                    key={`all-${item.ticketType}-${item.combination}-${idx}`}
                    onClick={() => toggleBetSelection(item.combination, item.ticketType)}
                    className={`cursor-pointer rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 sm:gap-4 transition border ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-500/60 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800/80 opacity-50 hover:opacity-75'
                    }`}
                  >
                    {/* Checkbox, Ticket Type Tag, and Combination */}
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
                      {renderTicketTypeBadge(item.ticketType)}
                      {renderCombinationBadge(item.combination)}
                    </div>

                    {/* Numbers: Odds & Purchase Stake */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-end">
                      {/* オッズ */}
                      <div className="text-right min-w-[70px]">
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

                      {/* 購入金額 */}
                      <div
                        className={`text-right min-w-[85px] px-2.5 py-1 rounded-lg border ${
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
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* INDIVIDUAL TICKET TYPE VIEW */
            (() => {
              const items =
                betType === 'trifecta'
                  ? trifectaBets
                  : betType === 'exacta'
                  ? exactaBets
                  : trioBets;

              if (items.length === 0) {
                return (
                  <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                    推奨買い目がありません（上部の設定から買い目点数を指定してください）
                  </div>
                );
              }

              return items.map((bet, idx) => {
                const isSelected = isCombSelected(bet.combination, betType);
                const row = isSelected ? allocationRowMap.get(bet.combination) : undefined;
                const odds = currentOddsMap ? currentOddsMap[bet.combination] : 0;
                const hasRowOdds = odds > 0;

                return (
                  <div
                    key={`${betType}-${bet.combination}-${idx}`}
                    onClick={() => toggleBetSelection(bet.combination, betType)}
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
                      {renderTicketTypeBadge(betType)}
                      {renderCombinationBadge(bet.combination)}
                    </div>

                    {/* Numbers: Odds & Purchase Stake */}
                    <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-end">
                      {/* オッズ */}
                      <div className="text-right min-w-[70px]">
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

                      {/* 購入金額 */}
                      <div
                        className={`text-right min-w-[85px] px-2.5 py-1 rounded-lg border ${
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
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Formation Summary Hint for 3連単 if applicable */}
        {(betType === 'trifecta' || betType === 'all') && trifectaFormations.length > 0 && (
          <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>3連単 参考フォーメーション:</span>
              <span className="font-mono text-slate-300 font-bold">
                {trifectaFormations.map((f) => f.formationText).join(' / ')}
              </span>
            </span>
            <span>（全 {trifectaBets.length}点）</span>
          </div>
        )}
      </div>
    </div>
  );
};
