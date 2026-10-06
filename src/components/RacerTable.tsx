import React from 'react';
import { BoatEntry } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';

interface Props {
  boats: BoatEntry[];
  firstProbabilities: number[]; // 0..1 for each boat index 0..5
}

export const RacerTable: React.FC<Props> = ({ boats, firstProbabilities }) => {
  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <span>出走表＆1着確率</span>
        </h2>
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

                  {/* Exhibition Time (WITHOUT '秒' unit as per spec!) */}
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
  );
};
