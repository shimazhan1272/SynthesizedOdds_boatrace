import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { BoatEntry, WeatherData } from '../types/boatrace';
import { BOAT_COLORS } from '../constants/boatrace';

interface Props {
  boats: BoatEntry[];
  courses: number[]; // 0-indexed courses (0..5 for each boat 0..5)
  weather: WeatherData;
  onUpdateBoatExhibition: (boatIndex: number, time: number) => void;
  onUpdateCourse: (boatIndex: number, course: number) => void;
  onUpdateWeather: (weather: WeatherData) => void;
}

export const ManualCorrection: React.FC<Props> = ({
  boats,
  courses,
  weather,
  onUpdateBoatExhibition,
  onUpdateCourse,
  onUpdateWeather,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-750/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 border border-slate-700 flex items-center justify-center">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>展示タイム・気象データ・進入コースの手動修正</span>
            </h3>
            <p className="text-xs text-slate-400">
              直前情報が未発表の時や独自の見立てを即時反映（変更で即時再計算）
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-700/80 bg-slate-900/60 space-y-5">
          {/* 1. Exhibition Times & Entering Courses */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300">
              各艇の進入コース＆展示タイム
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {boats.map((b, idx) => {
                const colorDef = BOAT_COLORS[b.boatNumber] || BOAT_COLORS[1];
                const currentCourse = (courses[idx] ?? idx) + 1; // 1-indexed

                return (
                  <div
                    key={b.boatNumber}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded font-black text-xs inline-flex items-center justify-center border ${colorDef.bgColor} ${colorDef.textColor} ${colorDef.borderColor}`}
                        >
                          {b.boatNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[90px]">
                          {b.racerName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {b.racerClass}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          進入コース
                        </label>
                        <select
                          value={currentCourse}
                          onChange={(e) =>
                            onUpdateCourse(idx, Number(e.target.value) - 1)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          {[1, 2, 3, 4, 5, 6].map((c) => (
                            <option key={c} value={c}>
                              {c}コース
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">
                          展示タイム
                        </label>
                        <input
                          type="number"
                          step={0.01}
                          min={6.0}
                          max={8.0}
                          value={b.exhibitionTime > 0 ? b.exhibitionTime : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateBoatExhibition(idx, val);
                          }}
                          placeholder="6.75"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Weather Data */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300">
              気象データ（風速・風向・波高）
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Wind Speed */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  風速 (m/s)
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={weather.windSpeed}
                  onChange={(e) =>
                    onUpdateWeather({
                      ...weather,
                      windSpeed: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="0"
                />
              </div>

              {/* Wind Direction Code */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  風向
                </label>
                <select
                  value={weather.windDirectionCode ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    onUpdateWeather({
                      ...weather,
                      windDirectionCode: val,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">不明 / 無風</option>
                  <option value="5">追い風 (コード5)</option>
                  <option value="13">向かい風 (コード13)</option>
                  <option value="9">右横風A (コード9)</option>
                  <option value="1">左横風B (コード1)</option>
                  <option value="4">追い風寄り (コード4)</option>
                  <option value="6">追い風寄り (コード6)</option>
                  <option value="12">向かい風寄り (コード12)</option>
                  <option value="14">向かい風寄り (コード14)</option>
                  <option value="17">無風 (コード17)</option>
                </select>
              </div>

              {/* Wave Height */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  波高 (cm)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={weather.waveHeight}
                  onChange={(e) =>
                    onUpdateWeather({
                      ...weather,
                      waveHeight: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
