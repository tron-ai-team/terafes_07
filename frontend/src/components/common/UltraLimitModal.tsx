import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Brain,
  Coins,
  Clock,
  X,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

export const UltraLimitModal: React.FC = () => {
  const {
    isUltraLimitModalOpen,
    setUltraLimitModalOpen,
    setSelectedAiMode,
    ultraCredits,
    setAdvancedAiModalOpen,
    uiLocale,
  } = useApp();

  if (!isUltraLimitModalOpen) return null;

  const handleContinueWithSmart = () => {
    setSelectedAiMode('SMART');
    setUltraLimitModalOpen(false);
  };

  const handleViewUsage = () => {
    setUltraLimitModalOpen(false);
    setAdvancedAiModalOpen(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ultra-limit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#D6E6F7] shadow-2xl shadow-purple-500/10 p-6 text-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={() => setUltraLimitModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Icon */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs shrink-0">
            <Coins className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              TRON Intelligence Limit
            </span>
            <h2 id="ultra-limit-title" className="text-lg font-extrabold text-slate-900 font-display mt-0.5">
              {uiLocale === 'ja'
                ? '本日のUltraクレジットが終了しました'
                : 'Your Ultra credits are finished for today.'}
            </h2>
          </div>
        </div>

        {/* Quota Progress Display */}
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-950">Daily Ultra Limit</span>
            <span className="font-mono font-bold text-purple-800">
              {ultraCredits.remaining} of {ultraCredits.total} credits remaining
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-purple-200/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(ultraCredits.remaining / ultraCredits.total) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-purple-700 pt-1">
            <div className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{ultraCredits.resetTime}</span>
            </div>
            <span className="text-slate-500">Resets daily at 00:00 UTC</span>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-xs text-slate-600 leading-relaxed">
          {uiLocale === 'ja'
            ? 'Ultra Pro Maxモデルの1日の割り当て枠（5回）を使い切りました。高推論能力を備えたSmartモードに切り替えて作業をそのまま継続できます。'
            : 'You have exhausted your daily allocation of 5 Ultra Pro Max credits. You can immediately continue with Smart mode, which offers deep reasoning powered by Gemma 3.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleContinueWithSmart}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-blue-700 transition-all cursor-pointer"
          >
            <Brain className="w-4 h-4 text-white" />
            <span>{uiLocale === 'ja' ? 'Smartで継続する' : 'Continue with Smart'}</span>
          </button>

          <button
            type="button"
            onClick={handleViewUsage}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>{uiLocale === 'ja' ? '使用状況を確認' : 'View Usage'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
