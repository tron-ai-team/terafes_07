import React from "react";
import { InteractiveHologramGlobe } from "./InteractiveHologramGlobe";
import { FloatingHologramIcons } from "./FloatingHologramIcons";

interface TronRobotStageProps {
  className?: string;
  mouseParallax?: { x: number; y: number };
}

export const TronRobotStage: React.FC<TronRobotStageProps> = ({
  className = "",
  mouseParallax = { x: 0, y: 0 },
}) => {
  const px = mouseParallax.x * 10;
  const py = mouseParallax.y * 6;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{
        transform: `translate(${px * 0.4}px, ${py * 0.3}px)`,
        transition: "transform 0.18s cubic-bezier(0.2, 0, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes robot-idle-breathe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes platform-pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.85)) drop-shadow(0 0 32px rgba(0, 140, 255, 0.5)); opacity: 0.92; }
          50% { filter: drop-shadow(0 0 24px rgba(0, 229, 255, 1.0)) drop-shadow(0 0 46px rgba(0, 140, 255, 0.75)); opacity: 1; }
        }
        @keyframes halo-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes halo-spin-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>

      {/* ── 1. BACKGROUND HALO ENERGY RINGS (Behind robot head & shoulders) ── */}
      <div className="absolute top-[32%] left-[44%] -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[420px] lg:w-[520px] h-[280px] sm:h-[420px] lg:h-[520px] pointer-events-none z-0">
        {/* Soft Radial Cyan Aura */}
        <div
          className="absolute inset-4 sm:inset-8 rounded-full blur-[32px] sm:blur-[42px]"
          style={{
            background: "radial-gradient(circle, rgba(0, 229, 255, 0.5) 0%, rgba(0, 140, 255, 0.25) 45%, transparent 75%)",
          }}
        />

        {/* Concentric Energy Halo Rings */}
        <svg viewBox="0 0 520 520" className="w-full h-full opacity-80">
          <circle
            cx="260"
            cy="260"
            r="230"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2.2"
            strokeDasharray="18 22 40 22"
            strokeOpacity="0.85"
            style={{
              transformOrigin: "260px 260px",
              animation: "halo-spin-cw 34s linear infinite",
              filter: "drop-shadow(0 0 8px rgba(0, 229, 255, 0.75))",
            }}
          />
          <circle
            cx="260"
            cy="260"
            r="185"
            fill="none"
            stroke="#0088ff"
            strokeWidth="2.2"
            strokeDasharray="50 16 12 16"
            strokeOpacity="0.9"
            style={{
              transformOrigin: "260px 260px",
              animation: "halo-spin-ccw 26s linear infinite",
              filter: "drop-shadow(0 0 6px rgba(0, 136, 255, 0.65))",
            }}
          />
          <circle
            cx="260"
            cy="260"
            r="135"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeDasharray="10 14 20 14"
            strokeOpacity="0.95"
            style={{
              transformOrigin: "260px 260px",
              animation: "halo-spin-cw 18s linear infinite",
              filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.85))",
            }}
          />
        </svg>
      </div>

      {/* ── 2. GLOWING FLOOR PEDESTAL / PORTAL RINGS ── */}
      <div
        className="absolute -bottom-6 sm:-bottom-10 left-1/2 -translate-x-1/2 w-[300px] sm:w-[460px] lg:w-[560px] h-[80px] sm:h-[110px] pointer-events-none z-0"
        style={{ animation: "platform-pulse-glow 4s ease-in-out infinite" }}
      >
        {/* Floor cyan radial glow */}
        <div
          className="absolute inset-0 rounded-full blur-[28px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0, 229, 255, 0.8) 0%, rgba(0, 140, 255, 0.45) 50%, transparent 80%)",
          }}
        />

        {/* Layered concentric portal rings with multi-tier bevels */}
        <svg viewBox="0 0 560 110" className="w-full h-full">
          {/* Outermost rim */}
          <ellipse
            cx="280"
            cy="55"
            rx="265"
            ry="48"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="3.6"
            strokeOpacity="0.95"
          />
          {/* Middle tier bevel ring */}
          <ellipse
            cx="280"
            cy="55"
            rx="210"
            ry="36"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.8"
            strokeOpacity="0.9"
          />
          {/* Inner portal disc */}
          <ellipse
            cx="280"
            cy="55"
            rx="155"
            ry="24"
            fill="rgba(0, 229, 255, 0.25)"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeOpacity="0.98"
          />
        </svg>
      </div>

      {/* ── 3. MAIN ROBOT BODY (High-Resolution Master Mascot) ── */}
      <div
        className="relative z-10 w-full flex items-center justify-center"
        style={{ animation: "robot-idle-breathe 5.2s ease-in-out infinite" }}
      >
        <img
          src="/images/assets/tron-robot-master.png"
          alt="TRON AI Master Robot"
          className="w-full max-h-[460px] sm:max-h-[520px] lg:max-h-[580px] xl:max-h-[620px] object-contain filter drop-shadow-[0_20px_35px_rgba(0,102,255,0.28)]"
          loading="eager"
        />

        {/* ── 4. 3D HOLOGRAPHIC GLOBE & FLOATING ICONS OVER EXTENDED PALM ── */}
        {/*
          Precisely aligned directly above the robot's palm and cupped between the fingers
        */}
        <div
          className="absolute top-[21%] right-[0%] sm:right-[4%] w-[170px] h-[170px] sm:w-[230px] sm:h-[230px] lg:w-[280px] lg:h-[280px] xl:w-[300px] xl:h-[300px] pointer-events-none z-20"
        >
          {/* Genuine 3D WebGL Holographic Globe */}
          <div className="absolute inset-0 z-10">
            <InteractiveHologramGlobe mousePosition={mouseParallax} />
          </div>

          {/* Floating Holographic Feature Icons */}
          <FloatingHologramIcons mouseParallax={mouseParallax} />
        </div>

      </div>

    </div>
  );
};

export default TronRobotStage;
