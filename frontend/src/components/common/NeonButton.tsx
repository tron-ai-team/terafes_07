import React from 'react';
import { Loader2 } from 'lucide-react';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl font-medium',
    md: 'px-5 py-2.5 text-sm rounded-2xl font-semibold',
    lg: 'px-6 py-3.5 text-base rounded-2xl font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 hover:brightness-105 active:scale-[0.98]',
    secondary:
      'bg-white/90 text-slate-700 border border-[#E2EEF8] shadow-sm hover:bg-white hover:border-[#008CFF]/30 hover:text-blue-600 active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-600 hover:bg-blue-50/60 hover:text-blue-600 active:scale-[0.98]',
    danger:
      'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-[0.98]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-200 select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
