import React from 'react';
import { AgentTaskStatus, AgentControlMode } from '../../types/desktopAgent';
import {
  Clock,
  Cpu,
  Play,
  AlertTriangle,
  Pause,
  UserCheck,
  CheckCircle2,
  XCircle,
  Square,
} from 'lucide-react';

interface AgentStatusBadgeProps {
  status: AgentTaskStatus;
  controlMode?: AgentControlMode;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({
  status,
  controlMode,
  size = 'md',
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    if (status === 'PAUSED' && controlMode === 'MANUAL') {
      return {
        label: 'Manual Control',
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
        icon: <UserCheck className="w-3.5 h-3.5 text-purple-600" />,
      };
    }

    switch (status) {
      case 'QUEUED':
        return {
          label: 'Queued',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
        };
      case 'PLANNING':
      case 'PLANNED':
        return {
          label: 'PLANNED',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500 animate-pulse',
          icon: <Cpu className="w-3.5 h-3.5 text-indigo-500 animate-spin" />,
        };
      case 'RUNNING':
      case 'EXECUTING':
        return {
          label: 'EXECUTING',
          bg: 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs shadow-blue-500/10',
          dot: 'bg-blue-500 animate-ping',
          icon: <Play className="w-3.5 h-3.5 text-blue-500 fill-blue-500 animate-pulse" />,
        };
      case 'WAITING_APPROVAL':
        return {
          label: 'WAITING_APPROVAL',
          bg: 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm shadow-amber-500/10',
          dot: 'bg-amber-500 animate-ping',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'WAITING_USER':
        return {
          label: 'WAITING_USER',
          bg: 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm shadow-amber-500/10',
          dot: 'bg-amber-500 animate-pulse',
          icon: <UserCheck className="w-3.5 h-3.5 text-amber-700" />,
        };
      case 'PAUSED':
        return {
          label: 'Paused',
          bg: 'bg-amber-50/80 text-amber-700 border-amber-200',
          dot: 'bg-amber-400',
          icon: <Pause className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'COMPLETED':
        return {
          label: 'COMPLETED',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'VERIFIED':
        return {
          label: 'VERIFIED',
          bg: 'bg-emerald-50 text-emerald-900 border-emerald-400 shadow-2xs',
          dot: 'bg-emerald-600',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />,
        };
      case 'FAILED':
        return {
          label: 'FAILED',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
        };
      case 'STOPPED':
        return {
          label: 'Stopped',
          bg: 'bg-slate-100 text-slate-600 border-slate-300',
          dot: 'bg-slate-400',
          icon: <Square className="w-3.5 h-3.5 text-slate-500 fill-slate-500" />,
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: null,
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border transition-all ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

