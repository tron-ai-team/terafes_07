import React from 'react';
import { UserRole, UserStatus, AuthProviderType } from '../../../types/admin';

export const RoleBadge: React.FC<{ role: UserRole; className?: string }> = ({ role, className = '' }) => {
  switch (role) {
    case 'OWNER':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          OWNER
        </span>
      );
    case 'ADMIN':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          ADMIN
        </span>
      );
    case 'USER':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
        >
          USER
        </span>
      );
  }
};

export const StatusBadge: React.FC<{ status: UserStatus | 'ONLINE' | 'OFFLINE' | 'DEGRADED'; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'ACTIVE':
    case 'ONLINE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {status}
        </span>
      );
    case 'SUSPENDED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          SUSPENDED
        </span>
      );
    case 'DEGRADED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          DEGRADED
        </span>
      );
    case 'DISABLED':
    case 'OFFLINE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {status}
        </span>
      );
  }
};

export const ProviderBadge: React.FC<{ provider: AuthProviderType; className?: string }> = ({
  provider,
  className = '',
}) => {
  if (provider === 'google') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs ${className}`}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Google
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 ${className}`}
    >
      <span className="text-slate-400">✉</span>
      Email
    </span>
  );
};
