import React, { useState } from 'react';
import {
  Sliders,
  MessageSquare,
  Mic,
  Video,
  FileText,
  Sparkles,
  RotateCcw,
  Plus,
  Shield,
  Edit2,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { AdminUser, GlobalQuotaConfig, UserQuotaOverride } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';
import { EditGlobalQuotaModal } from './EditGlobalQuotaModal';
import { UserQuotaModal } from '../users/UserQuotaModal';

interface QuotaManagementTabProps {
  globalQuotas: GlobalQuotaConfig;
  users: AdminUser[];
  onUpdateGlobalQuotas: (patch: any) => Promise<void>;
  onSaveQuotaOverride: (override: any) => Promise<void>;
  onRemoveQuotaOverride: (userId: number) => Promise<void>;
  onResetUsageToday: (userId: number) => Promise<void>;
  lang: 'en' | 'ja';
}

export const QuotaManagementTab: React.FC<QuotaManagementTabProps> = ({
  globalQuotas,
  users,
  onUpdateGlobalQuotas,
  onSaveQuotaOverride,
  onRemoveQuotaOverride,
  onResetUsageToday,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const [isEditGlobalModalOpen, setIsEditGlobalModalOpen] = useState(false);
  const [selectedUserForOverride, setSelectedUserForOverride] = useState<AdminUser | null>(null);

  // Users with overrides
  const overriddenUsers = users.filter((u) => u.quotaOverride != null);

  const toggleFeature = async (featureKey: keyof GlobalQuotaConfig['featuresEnabled']) => {
    const updatedFeatures = {
      ...globalQuotas.featuresEnabled,
      [featureKey]: !globalQuotas.featuresEnabled[featureKey],
    };
    await onUpdateGlobalQuotas({ featuresEnabled: updatedFeatures });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Global Daily Quotas Section (Matches Demo Numbers) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              {t.quotas.globalLimitsTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.quotas.globalLimitsDesc}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditGlobalModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{t.quotas.editGlobalLimits}</span>
          </button>
        </div>

        {/* Feature Limit Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.quotas.chatLimit}</span>
              <MessageSquare className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {globalQuotas.aiChatDailyLimit}{' '}
              <span className="text-xs font-normal text-slate-400">req/day</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.quotas.voiceLimit}</span>
              <Mic className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {globalQuotas.aiVoiceDailyLimit}{' '}
              <span className="text-xs font-normal text-slate-400">turns/day</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.quotas.interviewLimit}</span>
              <Video className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {globalQuotas.aiInterviewDailyLimit}{' '}
              <span className="text-xs font-normal text-slate-400">sess/day</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.quotas.cvMagicLimit}</span>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {globalQuotas.cvMagicFillDailyLimit}{' '}
              <span className="text-xs font-normal text-slate-400">gens/day</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">{t.quotas.cvAssistLimit}</span>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {globalQuotas.cvAiAssistDailyLimit}{' '}
              <span className="text-xs font-normal text-slate-400">req/day</span>
            </div>
          </div>
        </div>

        {/* Global Budgets & Reset Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
            <span className="text-slate-600 font-medium">{t.quotas.dailyTokens}:</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {globalQuotas.dailyTokenBudget.toLocaleString()} tokens
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
            <span className="text-slate-600 font-medium">{t.quotas.monthlySpendCap}:</span>
            <span className="font-bold text-slate-900 tabular-nums">
              ${globalQuotas.monthlySpendingCapUsd.toFixed(2)} / user
            </span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
            <span className="text-slate-600 font-medium">{t.quotas.resetSchedule}:</span>
            <span className="font-bold text-blue-700">{globalQuotas.resetSchedule}</span>
          </div>
        </div>
      </div>

      {/* 2. Feature Master Toggles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">{t.quotas.featureTogglesTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { key: 'aiChat', label: 'AI Chat Assistant', enabled: globalQuotas.featuresEnabled.aiChat },
            { key: 'aiVoice', label: 'AI Real-time Voice', enabled: globalQuotas.featuresEnabled.aiVoice },
            { key: 'aiInterview', label: 'AI Interview Engine', enabled: globalQuotas.featuresEnabled.aiInterview },
            { key: 'cvMagicFill', label: 'CV Magic Fill', enabled: globalQuotas.featuresEnabled.cvMagicFill },
            { key: 'cvAiAssist', label: 'CV AI Assist', enabled: globalQuotas.featuresEnabled.cvAiAssist },
          ].map((feat) => (
            <div
              key={feat.key}
              onClick={() => toggleFeature(feat.key as any)}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-700">{feat.label}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  feat.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {feat.enabled ? 'ENABLED' : 'PAUSED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Individual User Quota Overrides */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {t.quotas.individualOverridesTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.quotas.individualOverridesDesc}</p>
          </div>

          {/* User selector to add override */}
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                const u = users.find((x) => x.id === Number(e.target.value));
                if (u) setSelectedUserForOverride(u);
                e.target.value = '';
              }}
              defaultValue=""
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="" disabled>
                {t.quotas.addOverride}
              </option>
              {users
                .filter((u) => !u.quotaOverride && u.role !== 'OWNER')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Overrides Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">AI Chat Limit</th>
                <th className="py-2.5 px-4">AI Voice Turns</th>
                <th className="py-2.5 px-4">AI Interview</th>
                <th className="py-2.5 px-4">CV Magic Fill</th>
                <th className="py-2.5 px-4">Daily Token Ceiling</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overriddenUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No custom user overrides configured. All users are currently on the Global Default limits.
                  </td>
                </tr>
              ) : (
                overriddenUsers.map((u) => {
                  const ovr = u.quotaOverride!;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{u.displayName}</span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                            CUSTOM
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                        {ovr.aiChatDailyLimit} req/day
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                        {ovr.aiVoiceDailyLimit} turns/day
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                        {ovr.aiInterviewDailyLimit} sess/day
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                        {ovr.cvMagicFillDailyLimit} gens/day
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                        {(ovr.dailyTokenCeiling / 1000).toFixed(0)}k tokens
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForOverride(u)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Edit Custom Override"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveQuotaOverride(u.id)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title={t.quotas.resetToDefault}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Global Quotas Modal */}
      <EditGlobalQuotaModal
        currentConfig={globalQuotas}
        isOpen={isEditGlobalModalOpen}
        onClose={() => setIsEditGlobalModalOpen(false)}
        onSubmit={onUpdateGlobalQuotas}
        lang={lang}
      />

      {/* Edit User Quota Override Modal */}
      <UserQuotaModal
        user={selectedUserForOverride}
        globalQuotas={globalQuotas}
        isOpen={!!selectedUserForOverride}
        onClose={() => setSelectedUserForOverride(null)}
        onSaveOverride={onSaveQuotaOverride}
        onRemoveOverride={onRemoveQuotaOverride}
        onResetUsageToday={onResetUsageToday}
        lang={lang}
      />
    </div>
  );
};
