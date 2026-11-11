import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  deltaText?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  iconBgClass?: string;
  onClick?: () => void;
  className?: string;
}

export const AdminMetricCard: React.FC<AdminMetricCardProps> = ({
  title,
  value,
  deltaText,
  isPositive,
  subtitle,
  icon: Icon,
  iconColorClass = 'text-blue-600',
  iconBgClass = 'bg-blue-50 border-blue-100',
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-blue-300' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
          <div className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${iconBgClass}`}>
          <Icon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {deltaText && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              isPositive === true
                ? 'bg-emerald-50 text-emerald-700'
                : isPositive === false
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPositive === true && <TrendingUp className="w-3 h-3" />}
            {isPositive === false && <TrendingDown className="w-3 h-3" />}
            {deltaText}
          </span>
        )}
        {subtitle && <span className="text-xs text-slate-400 truncate">{subtitle}</span>}
      </div>
    </div>
  );
};
