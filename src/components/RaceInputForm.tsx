import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, MapPin, Flag, Search, RotateCcw, ChevronDown, Clock } from 'lucide-react';
import { STADIUMS } from '../constants/boatrace';
import { TodayStadiumStatus } from '../types/boatrace';

interface Props {
  date: string; // YYYY-MM-DD
  stadiumId: number;
  raceNumber: number;
  nTrifecta: number;
  nExacta: number;
  nTrio: number;
  isToday: boolean;
  todayStadiums: TodayStadiumStatus[];
  stadiumSchedule: { raceNumber: number; deadlineTime: string }[];
  isLoading: boolean;
  onDateChange: (date: string) => void;
  onStadiumChange: (stadiumId: number) => void;
  onRaceChange: (raceNumber: number) => void;
  onTrifectaChange: (val: number) => void;
  onExactaChange: (val: number) => void;
  onTrioChange: (val: number) => void;
  onSubmit: () => void;
}

export const RaceInputForm: React.FC<Props> = ({
  date,
  stadiumId,
  raceNumber,
  nTrifecta,
  nExacta,
  nTrio,
  isToday,
  todayStadiums,
  stadiumSchedule,
  isLoading,
  onDateChange,
  onStadiumChange,
  onRaceChange,
  onTrifectaChange,
  onExactaChange,
  onTrioChange,
  onSubmit,
}) => {
  // Current time state to re-evaluate deadline countdown every 10 seconds
  const [now, setNow] = useState<Date>(new Date());
  const [raceDropdownOpen, setRaceDropdownOpen] = useState(false);
  const raceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000); // 10s tick
    return () => clearInterval(timer);
  }, []);

  // Close custom dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (raceDropdownRef.current && !raceDropdownRef.current.contains(event.target as Node)) {
        setRaceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only display stadiums that are currently holding races (開催している場だけ表示)
  const availableStadiums = useMemo(() => {
    if (isToday && todayStadiums.length > 0) {
      const ongoing = STADIUMS.filter((s) => {
        const ts = todayStadiums.find((t) => t.stadiumId === s.id);
        return ts && !ts.allFinished;
      });
      // If there are ongoing stadiums, show only those! If all are finished, fallback to today's stadiums
      return ongoing.length > 0
        ? ongoing
        : STADIUMS.filter((s) => todayStadiums.some((t) => t.stadiumId === s.id));
    }
    return STADIUMS;
  }, [isToday, todayStadiums]);

  // Keep stadiumId synced if current stadium is not in availableStadiums
  useEffect(() => {
    if (availableStadiums.length > 0) {
      const exists = availableStadiums.some((s) => s.id === stadiumId);
      if (!exists) {
        onStadiumChange(availableStadiums[0].id);
      }
    }
  }, [availableStadiums, stadiumId, onStadiumChange]);

  // Find info for current stadium in today's data if available
  const currentTodayStadium = todayStadiums.find((ts) => ts.stadiumId === stadiumId);

  // Helper to determine status for a race
  const getRaceStatus = (rNo: number) => {
    const scheduleItem = stadiumSchedule?.find((s) => s.raceNumber === rNo);
    const raceInfo = currentTodayStadium?.races.find((r) => r.raceNumber === rNo);
    const deadlineTime = scheduleItem?.deadlineTime || raceInfo?.deadlineTime || '';

    let isWithin10Min = false;
    let isClosed = false;

    if (deadlineTime && deadlineTime.includes(':')) {
      const [h, m] = deadlineTime.split(':').map((v) => v.padStart(2, '0'));
      const targetISO = `${date}T${h}:${m}:00+09:00`;
      const targetTime = new Date(targetISO);
      const diffMs = targetTime.getTime() - Date.now();
      const diffMin = diffMs / 60000;

      if (diffMs <= 0 || raceInfo?.isFinished) {
        isClosed = true;
      } else if (diffMin <= 10) {
        isWithin10Min = true;
      }
    } else if (raceInfo?.isFinished) {
      isClosed = true;
    }

    return {
      deadlineTime,
      deadlineStr: deadlineTime ? `${deadlineTime}締切` : '',
      isWithin10Min,
      isClosed,
    };
  };

  const selectedRaceStatus = getRaceStatus(raceNumber);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Top row: Date, Stadium, Race No */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Date input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>開催年月日</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Stadium select */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>レース場（全24場）</span>
            {isToday && (
              <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1 rounded border border-cyan-800">
                当日開催場
              </span>
            )}
          </label>
          <select
            value={stadiumId}
            onChange={(e) => onStadiumChange(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            {availableStadiums.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}_{s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Race Number Custom Selector with deadline styling */}
        <div className="relative" ref={raceDropdownRef}>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-cyan-400" />
              <span>レース番号</span>
            </div>
            {selectedRaceStatus.isWithin10Min && !selectedRaceStatus.isClosed && (
              <span className="text-[10px] font-bold text-rose-400 animate-pulse flex items-center gap-1">
                <Clock className="w-3 h-3" />
                締切10分前
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={() => setRaceDropdownOpen(!raceDropdownOpen)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <span
              className={`font-semibold ${
                selectedRaceStatus.isClosed
                  ? 'line-through decoration-double decoration-slate-400 text-slate-400'
                  : selectedRaceStatus.isWithin10Min
                  ? 'text-rose-400 font-bold'
                  : 'text-white'
              }`}
            >
              {raceNumber}R {selectedRaceStatus.deadlineStr ? selectedRaceStatus.deadlineStr : ''}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Custom Dropdown list */}
          {raceDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 divide-y divide-slate-800">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((rNo) => {
                const status = getRaceStatus(rNo);
                return (
                  <button
                    key={rNo}
                    type="button"
                    onClick={() => {
                      onRaceChange(rNo);
                      setRaceDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      rNo === raceNumber ? 'bg-slate-800/80 font-bold' : ''
                    }`}
                  >
                    <span
                      className={`flex items-center gap-2 ${
                        status.isClosed
                          ? 'line-through decoration-double decoration-slate-400 text-slate-500'
                          : status.isWithin10Min
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-200'
                      }`}
                    >
                      <span className="font-bold">{rNo}R</span>
                      {status.deadlineTime ? (
                        <span className="text-xs font-mono">{status.deadlineTime}締切</span>
                      ) : null}
                    </span>
                    {status.isWithin10Min && !status.isClosed && (
                      <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800">
                        締切直前
                      </span>
                    )}
                    {status.isClosed && (
                      <span className="text-[10px] text-slate-500">締切済</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Second row: Ticket points (0 - 30) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
          <span>推奨買い目点数設定（各0〜30点）</span>
          <span className="text-[11px] text-slate-500">※変更で即座に再計算</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {/* 3連単 */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              3連単
            </label>
            <select
              value={nTrifecta}
              onChange={(e) => onTrifectaChange(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i} value={i}>
                  {i} 点
                </option>
              ))}
            </select>
          </div>

          {/* 2連単 */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              2連単
            </label>
            <select
              value={nExacta}
              onChange={(e) => onExactaChange(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i} value={i}>
                  {i} 点
                </option>
              ))}
            </select>
          </div>

          {/* 3連複 */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              3連複
            </label>
            <select
              value={nTrio}
              onChange={(e) => onTrioChange(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i} value={i}>
                  {i} 点
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Predict Button */}
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
      >
        {isLoading ? (
          <>
            <RotateCcw className="w-5 h-5 animate-spin" />
            <span>データ取得＆予想計算中...</span>
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            <span>予想する（直前情報・オッズ取得）</span>
          </>
        )}
      </button>
    </div>
  );
};
