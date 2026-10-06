import React from 'react';
import { StartExhibitionBoat } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';

interface Props {
  exhibitionTimes: { boatNumber: number; time: number }[];
  startExhibition: StartExhibitionBoat[];
}

export const ExhibitionCard: React.FC<Props> = ({
  exhibitionTimes,
  startExhibition,
}) => {
  // Sort start exhibition by course (1..6)
  const sortedExhibition = [...startExhibition].sort((a, b) => a.course - b.course);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <span>展示情報・スタート展示</span>
        </h3>
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
          {/* Slit Line */}
          <line
            x1="380"
            y1="10"
            x2="380"
            y2="215"
            stroke="#f8fafc"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text
            x="380"
            y="226"
            fill="#94a3b8"
            fontSize="10"
            textAnchor="middle"
            fontWeight="bold"
          >
            SLIT LINE
          </text>

          {/* Timing indicators */}
          <text x="320" y="10" fill="#64748b" fontSize="9" textAnchor="middle">
            .10
          </text>
          <text x="260" y="10" fill="#64748b" fontSize="9" textAnchor="middle">
            .20
          </text>
          <text x="200" y="10" fill="#64748b" fontSize="9" textAnchor="middle">
            .30
          </text>

          {/* 6 Courses from top to bottom (Course 1 to 6) */}
          {sortedExhibition.map((entry, idx) => {
            const courseNum = entry.course || idx + 1;
            const bNum = entry.boatNumber || courseNum;
            const colorDef = BOAT_COLORS[bNum] || BOAT_COLORS[1];
            const y = 26 + idx * 32;

            // Compute X position based on ST
            // Baseline at slit line (x=380).
            // Normal ST range: 0.00 to 0.40.
            // st = 0.00 -> x = 380
            // st = 0.10 -> x = 320
            // st = 0.20 -> x = 260
            // st = -0.05 (F) -> x = 410 (over the line)
            const st = entry.startTiming;
            const clampedST = Math.max(-0.15, Math.min(0.45, st));
            const x = 380 - clampedST * 600;

            const stLabel =
              st < 0
                ? `F${Math.abs(st).toFixed(2).replace('0.', '.')}`
                : `.${Math.round(st * 100).toString().padStart(2, '0')}`;

            return (
              <g key={courseNum}>
                {/* Course Track guide */}
                <line
                  x1="50"
                  y1={y}
                  x2="520"
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />

                {/* Course Number Label */}
                <text
                  x="20"
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {courseNum}コ
                </text>

                {/* Boat Body / Marker at position X */}
                {/* Boat outline */}
                <path
                  d={`M ${x - 18} ${y - 9} L ${x + 10} ${y - 9} L ${x + 18} ${y} L ${x + 10} ${y + 9} L ${x - 18} ${y + 9} Z`}
                  fill={
                    bNum === 1
                      ? '#ffffff'
                      : bNum === 2
                      ? '#1e293b'
                      : bNum === 3
                      ? '#dc2626'
                      : bNum === 4
                      ? '#2563eb'
                      : bNum === 5
                      ? '#eab308'
                      : '#16a34a'
                  }
                  stroke={bNum === 1 || bNum === 2 ? '#94a3b8' : 'none'}
                  strokeWidth="1"
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
  );
};
