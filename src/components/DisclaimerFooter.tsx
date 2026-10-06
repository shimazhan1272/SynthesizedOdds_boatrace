import React from 'react';
import { AlertCircle } from 'lucide-react';

export const DisclaimerFooter: React.FC = () => {
  return (
    <footer className="mt-8 pt-6 border-t border-slate-800 text-slate-500 text-xs space-y-3 pb-8">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-slate-400 text-[11px] sm:text-xs">
          統計モデルによる参考値です。係数は過去約26万レースから推定したもので、的中を保証するものではありません。回収率は控除率の水準で、期待値の高い買い目を示すものではありません。買い目点数は各券種0〜30点まで指定できます。オッズは取得時点の参考値で、確定オッズではありません。合成オッズや期待値の目安は的中や利益を保証しません。馬券・舟券の購入は自己責任で。
        </p>
      </div>
      <div className="text-center text-[11px] text-slate-600">
        ボートレースAI予想＆合成オッズ Web App
      </div>
    </footer>
  );
};
