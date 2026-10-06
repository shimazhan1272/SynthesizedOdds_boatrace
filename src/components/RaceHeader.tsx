import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { RaceDetail } from '../types/boatrace';

interface Props {
  detail: RaceDetail;
  courseOrder: number[]; // e.g. [1, 2, 3, 4, 5, 6] or [4, 1, 2, 3, 5, 6] (boat numbers in course 1..6)
  hasCourseDuplicateOrMissing: boolean;
}

export const RaceHeader: React.FC<Props> = ({
  detail,
  courseOrder,
  hasCourseDuplicateOrMissing,
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Determine race deadline status
  const deadlineStr = detail.deadlineTime;
  let isWithin10Min = false;
  let isClosed = false;

  if (deadlineStr && deadlineStr.includes(':')) {
    const [h, m] = deadlineStr.split(':').map((v) => v.padStart(2, '0'));
    const targetISO = `${detail.dateDisplay}T${h}:${m}:00+09:00`;
    const target = new Date(targetISO);
    const diffMs = target.getTime() - Date.now();
    const diffMin = diffMs / 60000;

    if (diffMs <= 0) {
      isClosed = true;
    } else if (diffMin <= 10) {
      isWithin10Min = true;
    }
  }

  // Check if entrance differs from wakunari (1-2-3-4-5-6)
  const isFrontEntry =
    courseOrder.length === 6 && courseOrder.some((bNo, idx) => bNo !== idx + 1);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl sm:text-2xl font-black text-white">
            {detail.stadiumName}
          </span>
          <span
            className={`text-xl sm:text-2xl font-black ${
              isClosed
                ? 'text-slate-400'
                : isWithin10Min
                ? 'text-rose-400'
                : 'text-cyan-400'
            }`}
          >
            {detail.raceNumber}R
          </span>
          <span className="text-sm sm:text-base font-semibold text-slate-300">
            {detail.raceTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isClosed
                ? 'bg-slate-900 border-slate-700 text-slate-400'
                : isWithin10Min
                ? 'bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>発売締切: {detail.deadlineTime}</span>
            {isWithin10Min && !isClosed && (
              <span className="font-bold text-rose-400">（締切直前）</span>
            )}
            {isClosed && <span className="text-slate-400 font-bold">（終了）</span>}
          </div>
        </div>
      </div>

      {/* Front entry (前付けあり) notification */}
      {isFrontEntry && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            前付けあり（進入が枠なりと異なる） 進入隊形:{' '}
            <strong className="text-amber-200 font-bold">
              {courseOrder.join('-')}
            </strong>
          </span>
        </div>
      )}

      {/* Warning for duplicated/missing courses in start exhibition */}
      {hasCourseDuplicateOrMissing && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-950/60 border border-orange-700/60 text-orange-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-orange-400" />
          <span>進入コースの重複・欠落を検知したため、枠なり進入で計算します。</span>
        </div>
      )}
    </div>
  );
};
