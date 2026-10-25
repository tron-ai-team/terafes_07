import React from 'react';
import { AIInterviewerState } from '../../types/interview';

interface TronLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  state?: AIInterviewerState;
  showGlow?: boolean;
}

export const TronLogo: React.FC<TronLogoProps> = ({
  size = 'md',
  className = '',
  state = 'idle',
  showGlow = true,
}) => {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    hero: 'w-28 h-28 md:w-32 md:h-32',
  };

  // State-specific animations and glow classes
  const getStateEffects = () => {
    switch (state) {
      case 'listening':
        return 'animate-ai-pulse filter drop-shadow-[0_0_20px_rgba(0,223,255,0.8)] scale-105 transition-all duration-300';
      case 'thinking':
        return 'animate-spin-slow filter drop-shadow-[0_0_18px_rgba(0,140,255,0.7)] transition-all duration-500';
      case 'speaking':
        return 'animate-pulse filter drop-shadow-[0_0_26px_rgba(0,223,255,0.95)] scale-105 transition-all duration-300';
      case 'error':
        return 'filter drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] transition-all duration-300';
      case 'idle':
      default:
        return showGlow ? 'filter drop-shadow-[0_0_14px_rgba(0,140,255,0.45)]' : '';
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Ambient background glow aura */}
      {showGlow && (
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/20 to-blue-600/30 blur-lg pointer-events-none ${
            state === 'listening' || state === 'speaking' ? 'opacity-100 scale-125' : 'opacity-70'
          } transition-all duration-500`}
        />
      )}

      {/* Actual uploaded TRON AI circular emblem */}
      <img
        src="/assets/tron-logo.png"
        alt="TRON AI Logo"
        className={`relative z-10 object-contain select-none transition-transform duration-300 ${sizeMap[size]} ${getStateEffects()}`}
        draggable={false}
      />
    </div>
  );
};
