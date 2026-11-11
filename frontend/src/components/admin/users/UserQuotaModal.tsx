import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, Sparkles } from 'lucide-react';
import { AdminUser, UserQuotaOverride, GlobalQuotaConfig } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface UserQuotaModalProps {
  user: AdminUser | null;
  globalQuotas: GlobalQuotaConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveOverride: (override: any) => Promise<void>;
  onRemoveOverride: (userId: number) => Promise<void>;
  onResetUsageToday: (userId: number) => Promise<void>;
  lang: 'en' | 'ja';
}

export const UserQuotaModal: React.FC<UserQuotaModalProps> = ({
  user,
  globalQuotas,
  isOpen,
  onClose,
  onSaveOverride,
  onRemoveOverride,
  onResetUsageToday,
  lang,
}) => {
  if (!isOpen || !user) return null;
  const t = adminTranslations[lang] || adminTranslations.en;

  const currentOverride = user.quotaOverride;

  const [chatLimit, setChatLimit] = useState(
    currentOverride ? currentOverride.aiChatDailyLimit : globalQuotas.aiChatDailyLimit
  );
  const [voiceLimit, setVoiceLimit] = useState(
    currentOverride ? currentOverride.aiVoiceDailyLimit : globalQuotas.aiVoiceDailyLimit
  );
  const [interviewLimit, setInterviewLimit] = useState(
    currentOverride ? currentOverride.aiInterviewDailyLimit : globalQuotas.aiInterviewDailyLimit
  );
  const [cvMagicLimit, setCvMagicLimit] = useState(
    currentOverride ? currentOverride.cvMagicFillDailyLimit : globalQuotas.cvMagicFillDailyLimit
  );
  const [cvAssistLimit, setCvAssistLimit] = useState(
    currentOverride ? currentOverride.cvAiAssistDailyLimit : globalQuotas.cvAiAssistDailyLimit
  );
  const [tokenCeiling, setTokenCeiling] = useState(
    currentOverride ? currentOverride.dailyTokenCeiling : globalQuotas.dailyTokenBudget
  );
  const [notes, setNotes] = useState(currentOverride?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveOverride({
        userId: user.id,
        aiChatDailyLimit: Number(chatLimit),
        aiVoiceDailyLimit: Number(voiceLimit),
        aiInterviewDailyLimit: Number(interviewLimit),
        cvMagicFillDailyLimit: Number(cvMagicLimit),
        cvAiAssistDailyLimit: Number(cvAssistLimit),
        dailyTokenCeiling: Number(tokenCeiling),
        notes,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSubmitting(true);
    try {
      await onRemoveOverride(user.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToday = async () => {
    setIsSubmitting(true);
    try {
      await onResetUsageToday(user.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Custom User Quotas & Daily Limits</h3>
              <p className="text-xs text-slate-500 mt-0.5">{user.displayName} ({user.email})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status pill */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span>
            {currentOverride ? (
              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-700">
                {t.quotas.overrideActive}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-200 text-slate-600">
                {t.quotas.inheritingGlobal}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetToday}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
            title="Reset consumed count for today back to 0"
          >
            <RotateCcw className="w-3 h-3" />
            {t.quotas.resetUsageToday}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.chatLimit} (req/day)
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={chatLimit}
                onChange={(e) => setChatLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Global default: {globalQuotas.aiChatDailyLimit}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.voiceLimit} (turns/day)
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={voiceLimit}
                onChange={(e) => setVoiceLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Global default: {globalQuotas.aiVoiceDailyLimit}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.interviewLimit} (sessions/day)
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={interviewLimit}
                onChange={(e) => setInterviewLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Global default: {globalQuotas.aiInterviewDailyLimit}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.cvMagicLimit} (gens/day)
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={cvMagicLimit}
                onChange={(e) => setCvMagicLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Global default: {globalQuotas.cvMagicFillDailyLimit}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.cvAssistLimit} (req/day)
              </label>
              <input
                type="number"
                min="0"
                max="99999"
                value={cvAssistLimit}
                onChange={(e) => setCvAssistLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Global default: {globalQuotas.cvAiAssistDailyLimit}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Daily Token Ceiling
              </label>
              <input
                type="number"
                step="10000"
                min="0"
                max="10000000"
                value={tokenCeiling}
                onChange={(e) => setTokenCeiling(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Global budget: {globalQuotas.dailyTokenBudget.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Administrative Notes / Justification</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP Enterprise demo candidate approved by owner"
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {currentOverride ? (
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isSubmitting}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
              >
                {t.quotas.resetToDefault}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
              >
                {isSubmitting ? 'Saving...' : t.common.save}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
