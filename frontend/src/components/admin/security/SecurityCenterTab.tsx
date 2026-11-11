import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Globe,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  XCircle,
  FileText,
  UserX,
  Server,
  Info,
} from 'lucide-react';
import { SecurityCenterResponseData } from '../../../services/admin/adminTypes';
import { adminTranslations } from '../../../locales/adminTranslations';
import { AdminConfirmModal } from '../common/AdminConfirmModal';

interface SecurityCenterTabProps {
  data: SecurityCenterResponseData;
  onRevokeUserSessions: (userId: number) => Promise<void>;
  onEmergencyRevoke: () => Promise<void>;
  lang: 'en' | 'ja';
}

export const SecurityCenterTab: React.FC<SecurityCenterTabProps> = ({
  data,
  onRevokeUserSessions,
  onEmergencyRevoke,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const { overview, failedLogins, securityEvents } = data;
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            {t.security.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.security.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsEmergencyModalOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.security.emergencyRevoke}</span>
        </button>
      </div>

      {/* 1. Authentication Infrastructure Posture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google OAuth Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-900">{t.security.googleOauth}</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Google Client ID configured. Scopes limited to profile and email. Passwords and OAuth secrets are fully isolated and never stored.
          </p>
        </div>

        {/* Email / BCrypt Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">{t.security.emailAuth}</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              BCRYPT (12 ROOUNDS)
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Salted BCrypt password hashes. Raw passwords cannot be decoded or viewed by administrators or system owners.
          </p>
        </div>

        {/* Admin MFA Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">{t.security.adminMfa}</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              ENFORCED
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Two-factor authentication mandatory for OWNER and ADMIN access levels to prevent credential-stuffing vulnerability.
          </p>
        </div>
      </div>

      {/* 2. Security Events & Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">{t.security.securityEvents}</h3>
        <div className="divide-y divide-slate-100 text-xs">
          {securityEvents.map((evt) => (
            <div key={evt.id} className="py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    evt.severity === 'HIGH' || evt.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : evt.severity === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {evt.severity}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{evt.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>IP: {evt.ipAddress}</span>
                    <span>•</span>
                    <span>{new Date(evt.timestamp).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{evt.type}</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 shrink-0">Resolved</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recent Failed Login Attempts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">{t.security.failedLogins}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Attempted Email</th>
                <th className="py-2.5 px-4">Origin IP Address</th>
                <th className="py-2.5 px-4">Geolocation / Network</th>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {failedLogins.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">{f.email}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{f.ipAddress}</td>
                  <td className="py-3 px-4 text-slate-600">{f.location}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(f.attemptedAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-medium text-rose-600">{f.failureReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Role Permissions Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">{t.security.roleMatrix}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Administrative Privilege</th>
                <th className="py-2.5 px-4 text-center">OWNER</th>
                <th className="py-2.5 px-4 text-center">ADMIN</th>
                <th className="py-2.5 px-4 text-center">USER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { perm: 'Access AI Career Center, Chat & Voice', owner: true, admin: true, user: true },
                { perm: 'View User Accounts & Activity Metrics', owner: true, admin: true, user: false },
                { perm: 'Suspend / Restore User Accounts', owner: true, admin: true, user: false },
                { perm: 'Modify Global Quotas & Custom Overrides', owner: true, admin: true, user: false },
                { perm: 'Configure AI Provider Failovers & Routing', owner: true, admin: false, user: false },
                { perm: 'Modify Platform Operational Mode (Maintenance)', owner: true, admin: false, user: false },
                { perm: 'Cannot be Suspended or Deleted', owner: true, admin: false, user: false },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{row.perm}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-emerald-600 font-bold">✓ Full</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.admin ? (
                      <span className="text-emerald-600 font-bold">✓ Yes</span>
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.user ? (
                      <span className="text-emerald-600 font-bold">✓ Yes</span>
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Revoke Confirmation Modal */}
      <AdminConfirmModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onConfirm={onEmergencyRevoke}
        title="Emergency Session Revocation"
        description="This will immediately invalidate ALL active JWT refresh tokens and sessions for all non-owner accounts across the entire platform. Users will be required to re-authenticate."
        confirmLabel="Execute Emergency Revocation"
        isDestructive={true}
        requiresReason={true}
        reasonLabel="Incident justification for Audit Log"
      />
    </div>
  );
};
