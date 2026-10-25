import React from 'react';

interface HUDCircleProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const HUDCircle: React.FC<HUDCircleProps> = ({
  className = '',
  size = 360,
  animate = true,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer subtle orbital ring with tick marks */}
      <svg
        className={`absolute inset-0 w-full h-full text-blue-400/20 ${animate ? 'animate-hud-spin' : ''}`}
        viewBox="0 0 360 360"
        fill="none"
      >
        <circle
          cx="180"
          cy="180"
          r="170"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 8"
          opacity="0.4"
        />
        <circle
          cx="180"
          cy="180"
          r="150"
          stroke="rgba(0, 140, 255, 0.25)"
          strokeWidth="1"
          strokeDasharray="24 12 6 12"
        />
        {/* Cardinal tick markers */}
        <line x1="180" y1="4" x2="180" y2="16" stroke="rgba(0, 223, 255, 0.6)" strokeWidth="2" />
        <line x1="180" y1="344" x2="180" y2="356" stroke="rgba(0, 223, 255, 0.6)" strokeWidth="2" />
        <line x1="4" y1="180" x2="16" y2="180" stroke="rgba(0, 223, 255, 0.6)" strokeWidth="2" />
        <line x1="344" y1="180" x2="356" y2="180" stroke="rgba(0, 223, 255, 0.6)" strokeWidth="2" />
      </svg>

      {/* Middle reverse-spinning ring */}
      <svg
        className={`absolute inset-0 w-full h-full ${animate ? 'animate-hud-spin-reverse' : ''}`}
        viewBox="0 0 360 360"
        fill="none"
      >
        <circle
          cx="180"
          cy="180"
          r="125"
          stroke="rgba(0, 223, 255, 0.22)"
          strokeWidth="1.5"
          strokeDasharray="40 15 10 15"
        />
        {/* Orbital dots */}
        <circle cx="180" cy="55" r="2.5" fill="#00DFFF" />
        <circle cx="180" cy="305" r="2.5" fill="#008CFF" />
      </svg>

      {/* Horizontal & vertical crosshair guide lines matching reference screenshot */}
      <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent pointer-events-none" />

      {/* Center glowing focal glow */}
      <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-400/15 via-blue-500/15 to-transparent blur-xl pointer-events-none" />
    </div>
  );
};
