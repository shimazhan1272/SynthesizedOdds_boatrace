import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Gauge } from 'lucide-react';
import { StartExhibitionBoat } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';

interface Props {
  exhibitionTimes: { boatNumber: number; time: number }[];
  startExhibition: StartExhibitionBoat[];
  defaultOpen?: boolean;
}

export const ExhibitionCard: React.FC<Props> = ({
  exhibitionTimes,
  startExhibition,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Sort start exhibition by course (1..6)
  const sortedExhibition = [...startExhibition].sort((a, b) => a.course - b.course);
  const courseSummary =
    sortedExhibition.length > 0
      ? sortedExhibition.map((b) => b.boatNumber).join(' ')
      : '';

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
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              展示情報・スタート展示
            </h3>
          </div>
          {courseSummary && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono">
              進入コース: {courseSummary}
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
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-slate-700/50">
          <div className="pt-2 text-right">
            <span className="text-[11px] text-slate-400">
              スリット隊形（コース進入順）
            </span>
          </div>

          {/* SVG Start Slit formation */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 overflow-hidden">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>スタート展示スリット隊形</span>
              <span className="text-cyan-400 text-[10px]">
                ※スリットライン（白破線）に近いほど早いスタート
              </span>
            </div>

            <svg
              viewBox="0 0 540 230"
              className="w-full h-auto select-none font-sans"
            >
              {/* Background grid lines */}
              <line
                x1="120"
                y1="10"
                x2="120"
                y2="215"
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <line
                x1="220"
                y1="10"
                x2="220"
                y2="215"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="320"
                y1="10"
                x2="320"
                y2="215"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="420"
                y1="10"
                x2="420"
                y2="215"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Slit line label */}
              <text
                x="120"
                y="18"
                fill="#94a3b8"
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
              >
                SLIT
              </text>
              <text
                x="220"
                y="18"
                fill="#64748b"
                fontSize="9"
                textAnchor="middle"
              >
                .10
              </text>
              <text
                x="320"
                y="18"
                fill="#64748b"
                fontSize="9"
                textAnchor="middle"
              >
                .20
              </text>
              <text
                x="420"
                y="18"
                fill="#64748b"
                fontSize="9"
                textAnchor="middle"
              >
                .30
              </text>

              {/* Boats row by course */}
              {Array.from({ length: 6 }).map((_, cIdx) => {
                const cNum = cIdx + 1;
                const boat = sortedExhibition.find((b) => b.course === cNum);
                const y = 35 + cIdx * 30;

                // Course number label
                return (
                  <g key={`course-${cNum}`}>
                    <text
                      x="25"
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {cNum}コース
                    </text>
                    <line
                      x1="55"
                      y1={y}
                      x2="520"
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Render boat markers */}
              {sortedExhibition.map((item) => {
                const bNum = item.boatNumber;
                const colorDef = BOAT_COLORS[bNum] || BOAT_COLORS[1];
                const cIdx = item.course - 1;
                const y = 35 + cIdx * 30;

                const st = item.startTiming;
                const x = Math.max(70, Math.min(500, 120 + st * 1000));
                const stLabel = st < 0 ? `F.${Math.abs(st).toFixed(2).slice(2)}` : `.${(st * 100).toFixed(0).padStart(2, '0')}`;

                return (
                  <g key={`boat-${bNum}`}>
                    <polygon
                      points={`${x},${y - 10} ${x + 22},${y - 10} ${x + 28},${y} ${x + 22},${y + 10} ${x},${y + 10}`}
                      fill={colorDef.number === 1 ? '#ffffff' : colorDef.number === 2 ? '#000000' : colorDef.number === 3 ? '#dc2626' : colorDef.number === 4 ? '#2563eb' : colorDef.number === 5 ? '#eab308' : '#16a34a'}
                      stroke="#475569"
                      strokeWidth="1.2"
                    />

                    {/* Boat number text inside boat */}
                    <text
                      x={x}
                      y={y + 4}
                      fill={colorDef.number === 1 || colorDef.number === 5 ? '#0f172a' : '#ffffff'}
                      fontSize="11"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      {bNum}
                    </text>

                    {/* ST Label */}
                    <text
                      x={x - 26}
                      y={y + 4}
                      fill={st < 0 ? '#f43f5e' : '#38bdf8'}
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {stLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Exhibition times list */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
            {exhibitionTimes.map((item) => {
              const colorDef = BOAT_COLORS[item.boatNumber] || BOAT_COLORS[1];
              return (
                <div
                  key={item.boatNumber}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center flex items-center justify-between sm:flex-col sm:justify-center gap-1.5"
                >
                  <div className="flex items-center gap-1.5 sm:justify-center">
                    <span
                      className={`w-5 h-5 rounded font-black text-xs inline-flex items-center justify-center border ${colorDef.bgColor} ${colorDef.textColor} ${colorDef.borderColor}`}
                    >
                      {item.boatNumber}
                    </span>
                    <span className="text-xs text-slate-400">展示</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-amber-300">
                    {item.time > 0 ? item.time.toFixed(2) : 'ー'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
