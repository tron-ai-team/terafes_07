import React, { useState } from 'react';
import { X, Sliders, ShieldCheck } from 'lucide-react';
import { GlobalQuotaConfig } from '../../../types/admin';
import { UpdateGlobalQuotaRequest } from '../../../services/admin/adminTypes';
import { adminTranslations } from '../../../locales/adminTranslations';

interface EditGlobalQuotaModalProps {
  currentConfig: GlobalQuotaConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patch: UpdateGlobalQuotaRequest) => Promise<void>;
  lang: 'en' | 'ja';
}

export const EditGlobalQuotaModal: React.FC<EditGlobalQuotaModalProps> = ({
  currentConfig,
  isOpen,
  onClose,
  onSubmit,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;

  const [chatLimit, setChatLimit] = useState(currentConfig.aiChatDailyLimit);
  const [voiceLimit, setVoiceLimit] = useState(currentConfig.aiVoiceDailyLimit);
  const [interviewLimit, setInterviewLimit] = useState(currentConfig.aiInterviewDailyLimit);
  const [cvMagicLimit, setCvMagicLimit] = useState(currentConfig.cvMagicFillDailyLimit);
  const [cvAssistLimit, setCvAssistLimit] = useState(currentConfig.cvAiAssistDailyLimit);
  const [dailyTokens, setDailyTokens] = useState(currentConfig.dailyTokenBudget);
  const [monthlyTokens, setMonthlyTokens] = useState(currentConfig.monthlyTokenBudget);
  const [spendCap, setSpendCap] = useState(currentConfig.monthlySpendingCapUsd);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        aiChatDailyLimit: Number(chatLimit),
        aiVoiceDailyLimit: Number(voiceLimit),
        aiInterviewDailyLimit: Number(interviewLimit),
        cvMagicFillDailyLimit: Number(cvMagicLimit),
        cvAiAssistDailyLimit: Number(cvAssistLimit),
        dailyTokenBudget: Number(dailyTokens),
        monthlyTokenBudget: Number(monthlyTokens),
        monthlySpendingCapUsd: Number(spendCap),
      });
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
              <h3 className="text-sm font-bold text-slate-900">{t.quotas.editGlobalLimits}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Applies to all standard registered users without custom overrides</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.chatLimit} (req/day)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={chatLimit}
                onChange={(e) => setChatLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.voiceLimit} (turns/day)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={voiceLimit}
                onChange={(e) => setVoiceLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.interviewLimit} (sessions/day)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={interviewLimit}
                onChange={(e) => setInterviewLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.cvMagicLimit} (gens/day)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={cvMagicLimit}
                onChange={(e) => setCvMagicLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.cvAssistLimit} (req/day)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={cvAssistLimit}
                onChange={(e) => setCvAssistLimit(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.monthlySpendCap}
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="1000"
                value={spendCap}
                onChange={(e) => setSpendCap(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.dailyTokens}
              </label>
              <input
                type="number"
                step="10000"
                value={dailyTokens}
                onChange={(e) => setDailyTokens(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {t.quotas.monthlyTokens}
              </label>
              <input
                type="number"
                step="100000"
                value={monthlyTokens}
                onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
        </form>
      </div>
    </div>
  );
};
