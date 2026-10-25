import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl bg-white/85 backdrop-blur-xl border border-[#E2EEF8] shadow-sm
        transition-all duration-300
        ${hoverEffect ? 'hover:border-[#008CFF]/40 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
