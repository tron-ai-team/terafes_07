import React from 'react';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface DemoModeBannerProps {
  isLive: boolean;
  className?: string;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ isLive, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        isLive
          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
          : 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20'
      } ${className}`}
      title={
        isLive
          ? 'Connected to live Spring Boot backend API with real-time MySQL metrics'
          : 'Operating in Sandbox Demo Mode with rich typed simulation fixtures ready for Cursor backend integration'
      }
    >
      {isLive ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold tracking-wide">SPRING API: CONNECTED</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold tracking-wide">DEMO FIXTURES (CURSOR READY)</span>
          <span className="hidden sm:inline text-[11px] opacity-75 border-l border-indigo-300 pl-2">
            Safe Staging Mode
          </span>
        </>
      )}
    </div>
  );
};
