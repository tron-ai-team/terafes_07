import React from 'react';
import { DesktopAgentStatus } from '../../types/desktopAgent';
import {
  Laptop,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderCode,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export interface StatusBadgeProps {
  status: DesktopAgentStatus | 'ONLINE' | 'BUSY' | 'OFFLINE' | 'REVOKED' | 'WAITING' | 'CONNECTED';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const norm = status ? status.toUpperCase() : 'OFFLINE';
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (norm) {
    case 'ONLINE':
    case 'CONNECTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs ${sizeClasses} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ONLINE
        </span>
      );
    case 'BUSY':
    case 'RUNNING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs ${sizeClasses} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          BUSY
        </span>
      );
    case 'REVOKED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          REVOKED
        </span>
      );
    case 'WAITING':
    case 'WAITING_BROWSER_AUTH':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          WAITING
        </span>
      );
    case 'OFFLINE':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          OFFLINE
        </span>
      );
  }
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  children,
  className = '',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md shadow-blue-500/5 text-center max-w-lg mx-auto space-y-4 animate-in fade-in ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{description}</p>
      </div>

      {children}

      {(actionText || secondaryActionText) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-4 pb-2 ${className}`}>
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          <span>{actionText}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export interface DeviceCardProps {
  hostname: string;
  os: string;
  status: DesktopAgentStatus;
  workspace?: string;
  lastSeen?: string;
  onOpen?: () => void;
  onMore?: () => void;
  className?: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  hostname,
  os,
  status,
  workspace,
  lastSeen = 'Now',
  onOpen,
  onMore,
  className = '',
}) => {
  return (
    <div
      className={`p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between gap-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-mono">{hostname}</h4>
            <p className="text-[11px] text-slate-500">{os}</p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Workspace:</span>
          <span className="font-mono text-slate-800 font-medium truncate max-w-[200px]">
            {workspace || '(Default)'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400">Last seen:</span>
          <span className="text-slate-700">{lastSeen}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors text-center"
          >
            Open
          </button>
        )}
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
          >
            Details
          </button>
        )}
      </div>
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      <span className="text-xs text-slate-500 font-medium">{message}</span>
    </div>
  );
};

export const ErrorNotice: React.FC<{ message: string; title?: string; className?: string }> = ({
  message,
  title = 'Notice',
  className = '',
}) => {
  return (
    <div
      className={`p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5 ${className}`}
    >
      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <span className="font-bold block text-rose-800">{title}</span>
        <span className="leading-relaxed block">{message}</span>
      </div>
    </div>
  );
};
