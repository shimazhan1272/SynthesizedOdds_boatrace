import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { BoatEntry } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';

interface Props {
  boats: BoatEntry[];
  firstProbabilities: number[]; // 0..1 for each boat index 0..5
  defaultOpen?: boolean;
}

export const RacerTable: React.FC<Props> = ({
  boats,
  firstProbabilities,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Find top favorite boat by probability
  const topBoatIdx =
    firstProbabilities.length > 0
      ? firstProbabilities.indexOf(Math.max(...firstProbabilities))
      : -1;
  const topBoat = topBoatIdx >= 0 ? boats[topBoatIdx] : null;
  const topPct =
    topBoatIdx >= 0 ? (firstProbabilities[topBoatIdx] * 100).toFixed(1) : null;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-lg overflow-hidden transition-all">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-750/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              出走表＆1着確率
            </h2>
          </div>
          {topBoat && topPct && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono">
              1着有力: {topBoat.boatNumber}号艇 {topBoat.racerName} ({topPct}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {isOpen ? '折りたたむ' : '展開して表示'}
          </span>
          <div className="p-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 space-y-3 border-t border-slate-700/50">
          <div className="text-right pt-2">
            <span className="text-[11px] text-slate-400">
              ※1着確率は統計モデルによる推定値
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-thin">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                  <th className="py-2.5 px-2 text-center w-12 font-semibold">艇</th>
                  <th className="py-2.5 px-3 font-semibold">選手名</th>
                  <th className="py-2.5 px-2 font-semibold text-center">支部</th>
                  <th className="py-2.5 px-2 font-semibold text-center">級別</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[140px]">1着確率</th>
                  <th className="py-2.5 px-2 font-semibold text-right">全国勝率</th>
                  <th className="py-2.5 px-2 font-semibold text-right">全国2連率</th>
                  <th className="py-2.5 px-2 font-semibold text-right">全国3連率</th>
                  <th className="py-2.5 px-2 font-semibold text-right">当地2連率</th>
                  <th className="py-2.5 px-2 font-semibold text-right">当地3連率</th>
                  <th className="py-2.5 px-2 font-semibold text-right">モータ2連</th>
                  <th className="py-2.5 px-2 font-semibold text-right">平均ST</th>
                  <th className="py-2.5 px-2 font-semibold text-right">展示タイム</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono text-[13px]">
                {boats.map((b, idx) => {
                  const colorDef = BOAT_COLORS[b.boatNumber] || BOAT_COLORS[1];
                  const p1 = firstProbabilities[idx] ?? 0;
                  const p1Pct = (p1 * 100).toFixed(1);

                  return (
                    <tr
                      key={b.boatNumber}
                      className="hover:bg-slate-750/50 transition-colors"
                    >
                      {/* Boat number with official color */}
                      <td className="py-2 px-1 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded font-black text-xs border ${colorDef.bgColor} ${colorDef.textColor} ${colorDef.borderColor}`}
                        >
                          {b.boatNumber}
                        </span>
                      </td>

                      {/* Racer Name */}
                      <td className="py-2 px-3 font-sans font-bold text-slate-100">
                        {b.racerName}
                      </td>

                      {/* Branch */}
                      <td className="py-2 px-2 text-center font-sans text-slate-300">
                        {b.branch}
                      </td>

                      {/* Grade */}
                      <td className="py-2 px-2 text-center font-sans font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                            b.racerClass === 'A1'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                              : b.racerClass === 'A2'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {b.racerClass}
                        </span>
                      </td>

                      {/* 1st Place Probability with bar */}
                      <td className="py-2 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-700/70 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, p1 * 100))}%` }}
                            />
                          </div>
                          <span className="font-bold text-cyan-300 text-xs w-11 text-right">
                            {p1Pct}%
                          </span>
                        </div>
                      </td>

                      {/* National Win Rate */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.nationalWinRate ? b.nationalWinRate.toFixed(2) : 'ー'}
                      </td>

                      {/* National Top 2 Rate (2 decimals) */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.nationalTop2Rate ? `${b.nationalTop2Rate.toFixed(2)}%` : 'ー'}
                      </td>

                      {/* National Top 3 Rate (2 decimals) */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.nationalTop3Rate ? `${b.nationalTop3Rate.toFixed(2)}%` : 'ー'}
                      </td>

                      {/* Local Top 2 Rate (2 decimals) */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.localTop2Rate ? `${b.localTop2Rate.toFixed(2)}%` : 'ー'}
                      </td>

                      {/* Local Top 3 Rate (2 decimals) */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.localTop3Rate ? `${b.localTop3Rate.toFixed(2)}%` : 'ー'}
                      </td>

                      {/* Motor Top 2 Rate */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.motorTop2Rate ? `${b.motorTop2Rate.toFixed(2)}%` : 'ー'}
                      </td>

                      {/* Avg ST */}
                      <td className="py-2 px-2 text-right font-medium text-slate-200">
                        {b.avgST ? b.avgST.toFixed(2) : 'ー'}
                      </td>

                      {/* Exhibition Time */}
                      <td className="py-2 px-2 text-right font-bold text-amber-300">
                        {b.exhibitionTime > 0 ? b.exhibitionTime.toFixed(2) : 'ー'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
