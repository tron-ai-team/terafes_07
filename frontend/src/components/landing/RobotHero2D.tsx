import React from 'react';

interface RobotHero2DProps {
  className?: string;
}

export const RobotHero2D: React.FC<RobotHero2DProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full max-w-[520px] aspect-square flex items-center justify-center select-none ${className}`}>
      {/* 1. Futuristic Holographic Ceiling/Floor Ring Effects */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outer rotating holographic energy ring */}
        <div 
          className="w-[96%] h-[96%] rounded-full border border-cyan-400/30 border-dashed animate-spin-slow"
          style={{
            boxShadow: '0 0 60px rgba(0, 229, 255, 0.15), inset 0 0 40px rgba(0, 102, 255, 0.1)',
          }}
        />

        {/* Middle counter-rotating ring */}
        <div 
          className="w-[82%] h-[82%] rounded-full border border-blue-500/25 animate-spin-reverse-slow"
        />

        {/* Inner glowing pulse ring */}
        <div 
          className="w-[68%] h-[68%] rounded-full border-2 border-cyan-300/40 animate-pulse-glow"
        />

        {/* Soft Radial Cyan Backdrop Halo */}
        <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-400/25 via-blue-500/20 to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* 2. Official 2D TRON Robot Mascot Cutout */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <div className="relative max-w-[92%] max-h-[95%] flex items-center justify-center">
          <img
            src="/images/assets/tron-mascot-cutout.png"
            alt="TRON AI Official Robot Mascot"
            className="w-full h-auto object-contain drop-shadow-[0_25px_45px_rgba(0,102,255,0.28)] animate-float-gentle"
            loading="eager"
          />

          {/* Glowing Visor Neural Light Flare */}
          <div 
            className="absolute top-[21%] left-[53%] -translate-x-1/2 w-14 h-14 rounded-full bg-cyan-400/30 blur-[10px] animate-pulse pointer-events-none"
          />

          {/* Glowing Inverted Delta Chest Reactor Light Flare */}
          <div 
            className="absolute top-[59%] left-[62%] -translate-x-1/2 w-10 h-10 rounded-full bg-cyan-400/40 blur-[12px] animate-pulse pointer-events-none"
          />

          {/* Sub-chassis floor reflection aura */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-cyan-400/20 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
