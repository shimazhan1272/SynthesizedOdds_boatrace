import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, RotateCcw } from 'lucide-react';
import { CONFIG } from '../constants/boatrace';
import { CoefSliders } from '../types/boatrace';

interface Props {
  sliders: CoefSliders;
  onChange: (sliders: CoefSliders) => void;
}

export const ModelSliders: React.FC<Props> = ({ sliders, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSliderChange = (key: keyof CoefSliders, val: number) => {
    onChange({
      ...sliders,
      [key]: val,
    });
  };

  const handleResetSingle = (key: keyof CoefSliders) => {
    onChange({
      ...sliders,
      [key]: 0,
    });
  };

  const handleResetAll = () => {
    onChange({
      localTop2: 0,
      motorTop2: 0,
      exhibitionTime: 0,
    });
  };

  // Base coefficients
  const baseL2 = CONFIG.cL2;
  const baseM2 = CONFIG.cM2;
  // Average base exhibition coef across courses for display
  const avgBaseEx =
    CONFIG.EX_COEF.reduce((a, b) => a + b, 0) / CONFIG.EX_COEF.length;

  const effL2 = baseL2 * (1 + sliders.localTop2 / 3);
  const effM2 = baseM2 * (1 + sliders.motorTop2 / 3);
  const effEx = avgBaseEx * (1 + sliders.exhibitionTime / 3);

  const isModified =
    sliders.localTop2 !== 0 ||
    sliders.motorTop2 !== 0 ||
    sliders.exhibitionTime !== 0;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-750/50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-cyan-400 border border-slate-700 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>予想モデル係数調整</span>
              {isModified && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  調整適用中
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              当地2連率・モーター2連率・展示タイムの影響度をカスタマイズ（-3.0〜+3.0）
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
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>実効係数 ＝ 基準値 × (1 ＋ スライダー値 / 3)</span>
            {isModified && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>すべて初期値(0)に戻す</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* 1. 当地2連率 */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">
                    当地2連率係数
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    (基準: {baseL2.toFixed(4)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {sliders.localTop2 > 0 ? `+${sliders.localTop2.toFixed(1)}` : sliders.localTop2.toFixed(1)}
                    {' → '}
                    実効: {effL2.toFixed(4)}
                  </span>
                  {sliders.localTop2 !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleResetSingle('localTop2')}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      0に戻す
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={sliders.localTop2}
                onChange={(e) =>
                  handleSliderChange('localTop2', parseFloat(e.target.value))
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-3.0 (影響無効 0倍)</span>
                <span>0.0 (標準 1倍)</span>
                <span>+3.0 (強化 2倍)</span>
              </div>
            </div>

            {/* 2. モーター2連率 */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">
                    モーター2連率係数
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    (基準: {baseM2.toFixed(4)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {sliders.motorTop2 > 0 ? `+${sliders.motorTop2.toFixed(1)}` : sliders.motorTop2.toFixed(1)}
                    {' → '}
                    実効: {effM2.toFixed(4)}
                  </span>
                  {sliders.motorTop2 !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleResetSingle('motorTop2')}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      0に戻す
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={sliders.motorTop2}
                onChange={(e) =>
                  handleSliderChange('motorTop2', parseFloat(e.target.value))
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-3.0 (影響無効 0倍)</span>
                <span>0.0 (標準 1倍)</span>
                <span>+3.0 (強化 2倍)</span>
              </div>
            </div>

            {/* 3. 展示タイム補正 */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">
                    展示タイム補正係数
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    (コース平均: {avgBaseEx.toFixed(3)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {sliders.exhibitionTime > 0 ? `+${sliders.exhibitionTime.toFixed(1)}` : sliders.exhibitionTime.toFixed(1)}
                    {' → '}
                    実効: {effEx.toFixed(3)}
                  </span>
                  {sliders.exhibitionTime !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleResetSingle('exhibitionTime')}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      0に戻す
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={sliders.exhibitionTime}
                onChange={(e) =>
                  handleSliderChange('exhibitionTime', parseFloat(e.target.value))
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-3.0 (展示無効 0倍)</span>
                <span>0.0 (標準 1倍)</span>
                <span>+3.0 (強化 2倍)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
