import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FuturisticInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
  error?: string;
}

export const FuturisticInput: React.FC<FuturisticInputProps> = ({
  label,
  icon,
  isPassword = false,
  error,
  className = '',
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          className={`
            w-full rounded-xl bg-white/95 border border-[#E2EEF8] text-slate-800 text-sm placeholder:text-slate-400
            transition-all duration-200 outline-none
            ${icon ? 'pl-10' : 'pl-3.5'}
            ${isPassword ? 'pr-10' : 'pr-3.5'}
            py-2.5
            focus:border-[#008CFF] focus:ring-2 focus:ring-[#008CFF]/20 focus:bg-white
            ${error ? 'border-red-400 ring-1 ring-red-300' : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-medium pl-1">{error}</p>}
    </div>
  );
};
