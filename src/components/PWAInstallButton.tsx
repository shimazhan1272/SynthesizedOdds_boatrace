import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-200 bg-cyan-950/70 border border-cyan-700/60 rounded-lg hover:bg-cyan-900/80 transition-colors shadow-sm cursor-pointer"
        title="ホーム画面に追加してアプリとして利用"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>アプリ追加</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-200 bg-cyan-950/70 border border-cyan-700/60 rounded-lg hover:bg-cyan-900/80 transition-colors shadow-sm cursor-pointer"
          title="iPhone/iPadにインストール"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>iOS追加</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  ホーム画面に追加 (iOS)
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-cyan-400">1.</span>
                  Safari下部の共有ボタン（四角から上矢印のアイコン）をタップ
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-cyan-400">2.</span>
                  メニューをスクロールし「ホーム画面に追加」をタップ
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-cyan-400">3.</span>
                  右上の「追加」をタップすると全画面アプリとして使えます
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-semibold text-white text-sm transition"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
