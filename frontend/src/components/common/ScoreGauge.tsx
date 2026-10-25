import React from 'react';

interface ScoreGaugeProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
  label = 'Score',
  sublabel,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const getScoreColor = () => {
    if (clampedScore >= 80) return 'from-cyan-400 to-blue-600';
    if (clampedScore >= 60) return 'from-blue-400 to-indigo-600';
    return 'from-amber-400 to-rose-500';
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00DFFF" />
            <stop offset="100%" stopColor="#0066FF" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 140, 255, 0.12)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress stroke with glowing cyan/blue */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(0, 223, 255, 0.4))',
          }}
        />
      </svg>

      {/* Center text content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold text-slate-800 tracking-tight font-display">
          {clampedScore}
          <span className="text-sm font-semibold text-blue-500 ml-0.5">%</span>
        </span>
        {label && <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>}
      </div>

      {sublabel && (
        <span className="mt-2 text-xs font-medium text-slate-600 text-center max-w-[140px]">
          {sublabel}
        </span>
      )}
    </div>
  );
};
