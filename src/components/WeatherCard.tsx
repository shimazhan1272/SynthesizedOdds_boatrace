import React from 'react';
import { Wind, Waves, Compass } from 'lucide-react';
import { WeatherData } from '../types/boatrace';
import { WIND_DIR_NAMES } from '../constants/boatrace';
import { calcWindEffectDifferences } from '../utils/prediction';

interface Props {
  weather: WeatherData;
}

export const WeatherCard: React.FC<Props> = ({ weather }) => {
  const { windSpeed, windDirectionCode, waveHeight } = weather;

  const hasWind = windSpeed > 0 && windDirectionCode !== null && windDirectionCode < 17;
  const windDiffs = hasWind ? calcWindEffectDifferences(weather) : null;
  const dirName =
    windDirectionCode !== null && WIND_DIR_NAMES[windDirectionCode]
      ? WIND_DIR_NAMES[windDirectionCode]
      : '不明 / 無風';

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <span>気象情報＆風補正効果</span>
        </h3>
        <span className="text-[11px] text-slate-400">水面・気象観測値</span>
      </div>

      {/* Weather metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>風速</span>
          </div>
          <span className="font-mono text-base sm:text-lg font-bold text-white">
            {windSpeed > 0 ? `${windSpeed}m` : '0m (無風)'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>風向</span>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-full">
            {dirName}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>波高</span>
          </div>
          <span className="font-mono text-base sm:text-lg font-bold text-white">
            {waveHeight ? `${waveHeight}cm` : '0cm'}
          </span>
        </div>
      </div>

      {/* Wind effect on courses */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs">
        <div className="font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>コース別の風補正効果（コース平均からの差）:</span>
        </div>
        {hasWind && windDiffs ? (
          <div>
            <div className="text-cyan-300 font-mono text-[11px] sm:text-xs leading-relaxed">
              風速{windSpeed}m・{dirName}:{' '}
              {windDiffs.map((diff, c) => (
                <span key={c} className="mr-2 inline-block">
                  <span className="text-slate-400">{c + 1}コース:</span>
                  <strong
                    className={
                      diff > 0
                        ? 'text-emerald-400'
                        : diff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                  </strong>
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              ※追い風時はイン低下＆2コース差し上昇、向かい風・強風時はダッシュ艇有利など過去26万レースの統計パラメータが自動反映されます。
            </p>
          </div>
        ) : (
          <div className="text-slate-400">
            風補正なし（風速0mまたは無風）
          </div>
        )}
      </div>
    </div>
  );
};
