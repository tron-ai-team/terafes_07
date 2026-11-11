import React from 'react';
import {
  X,
  Shield,
  Clock,
  Calendar,
  AlertTriangle,
  Lock,
  Pause,
  Play,
  Trash2,
  Sliders,
  KeyRound,
  ExternalLink,
  History,
  Info,
} from 'lucide-react';
import { AdminUser } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';
import { RoleBadge, StatusBadge, ProviderBadge } from '../common/AdminBadge';

interface UserDetailDrawerProps {
  user: AdminUser | null;
  onClose: () => void;
  lang: 'en' | 'ja';
  onSuspend: (user: AdminUser) => void;
  onRestore: (user: AdminUser) => void;
  onChangeRole: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onManageQuotas: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  user,
  onClose,
  lang,
  onSuspend,
  onRestore,
  onChangeRole,
  onResetPassword,
  onManageQuotas,
  onDeleteUser,
}) => {
  if (!user) return null;
  const t = adminTranslations[lang] || adminTranslations.en;
  const isOwner = user.role === 'OWNER';
  const isGoogle = user.authProvider === 'google';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate leading-tight">{user.displayName}</h2>
              <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
            <ProviderBadge provider={user.authProvider} />
            <span className="text-xs text-slate-400 font-mono">UID: #{user.id}</span>
          </div>

          {/* Google Auth Notice */}
          {isGoogle && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{t.users.drawer.googleAuthNote}</p>
            </div>
          )}

          {/* Account Metadata Grid */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.users.drawer.accountDetails}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">{t.users.columns.registered}</span>
                <span className="font-semibold text-slate-800">
                  {new Date(user.registeredAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t.users.columns.lastLogin}</span>
                <span className="font-semibold text-slate-800">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Account Status</span>
                <span className="font-semibold text-slate-800">{user.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Quota Profile</span>
                <span className="font-semibold text-slate-800">
                  {user.quotaOverride ? (
                    <span className="text-blue-600 font-bold">Custom Override</span>
                  ) : (
                    'Global Default'
                  )}
                </span>
              </div>
            </div>
            {user.suspendReason && (
              <div className="mt-2 pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-rose-600 font-bold">Suspension Justification:</span>
                <p className="text-slate-600 mt-0.5 italic">{user.suspendReason}</p>
              </div>
            )}
          </div>

          {/* AI Usage Breakdown */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t.users.drawer.aiUsageBreakdown}
              </h3>
              <span className="text-[11px] font-semibold text-blue-600">
                Est. Cost Today: ${user.aiUsageToday.costEstimate.toFixed(3)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Today Req</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  {user.aiUsageToday.totalRequests}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Month Req</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  {user.aiUsageMonthly.totalRequests}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Tokens (k)</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  {(user.aiUsageToday.tokensUsed / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Month Cost</span>
                <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                  ${user.aiUsageMonthly.costEstimate.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>AI Chat:</span>
                <span className="font-semibold text-slate-900">{user.featureUsageToday.chat} req</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>AI Voice Turns:</span>
                <span className="font-semibold text-slate-900">{user.featureUsageToday.voice} turns</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>AI Interview Sessions:</span>
                <span className="font-semibold text-slate-900">{user.featureUsageToday.interview} sessions</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CV Magic Fill:</span>
                <span className="font-semibold text-slate-900">{user.featureUsageToday.cvMagicFill} gens</span>
              </div>
            </div>
          </div>

          {/* Account Controls */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.users.drawer.accountControls}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Suspend or Restore */}
              {user.status === 'SUSPENDED' ? (
                <button
                  type="button"
                  onClick={() => onRestore(user)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t.users.drawer.restoreAccount}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isOwner}
                  onClick={() => onSuspend(user)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {t.users.drawer.suspendAccount}
                </button>
              )}

              {/* Assign Role */}
              <button
                type="button"
                disabled={isOwner}
                onClick={() => onChangeRole(user)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Shield className="w-3.5 h-3.5" />
                {t.users.drawer.changeRole}
              </button>

              {/* Reset Password (local accounts only) */}
              <button
                type="button"
                disabled={isGoogle}
                onClick={() => onResetPassword(user)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={isGoogle ? 'Managed by Google OAuth' : 'Generate temporary password'}
              >
                <KeyRound className="w-3.5 h-3.5" />
                {t.users.drawer.resetPassword}
              </button>

              {/* Manage Quotas */}
              <button
                type="button"
                onClick={() => onManageQuotas(user)}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                {t.users.drawer.customQuotas}
              </button>
            </div>

            {/* Permanent Delete */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isOwner}
                onClick={() => onDeleteUser(user)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.users.drawer.deleteAccount}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
