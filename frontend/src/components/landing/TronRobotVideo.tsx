import React from 'react';

interface TronRobotProps {
  className?: string;
  mouseParallax?: { x: number; y: number };
}

export const TronRobotVideo: React.FC<TronRobotProps> = ({
  className = '',
  mouseParallax = { x: 0, y: 0 },
}) => {
  const px = mouseParallax.x * 6;
  const py = mouseParallax.y * 4;

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      style={{
        transform: `translate(${px}px, ${py}px)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* ── KEYFRAME STYLES FOR ENERGY RINGS & GLOW ── */}
      <style>{`
        @keyframes robot-ring-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes robot-ring-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes robot-aura-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes robot-platform-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.75)) drop-shadow(0 0 20px rgba(0, 140, 255, 0.4)); }
          50% { filter: drop-shadow(0 0 18px rgba(0, 229, 255, 0.95)) drop-shadow(0 0 32px rgba(0, 140, 255, 0.65)); }
        }
      `}</style>

      {/* ── ROTATING ENERGY RINGS DIRECTLY BEHIND ROBOT ── */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] sm:w-[480px] lg:w-[520px] h-[440px] sm:h-[480px] lg:h-[520px] pointer-events-none z-0">
        
        {/* Soft Radial Cyan Aura */}
        <div
          className="absolute inset-16 rounded-full blur-[48px]"
          style={{
            background: "radial-gradient(circle, rgba(0, 229, 255, 0.6) 0%, rgba(0, 140, 255, 0.35) 45%, transparent 75%)",
            animation: "robot-aura-pulse 4.5s ease-in-out infinite",
          }}
        />

        {/* Concentric SVG Energy Rings */}
        <svg viewBox="0 0 520 520" className="w-full h-full">
          {/* Ring 1: Outermost dashed cyan ring (CW 32s) */}
          <circle
            cx="260"
            cy="260"
            r="240"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2.5"
            strokeDasharray="16 20 36 20"
            strokeOpacity="0.85"
            style={{
              transformOrigin: "260px 260px",
              animation: "robot-ring-cw 32s linear infinite",
              filter: "drop-shadow(0 0 8px rgba(0, 229, 255, 0.8))",
            }}
          />

          {/* Ring 2: Electric blue counter-rotating ring (CCW 24s) */}
          <circle
            cx="260"
            cy="260"
            r="195"
            fill="none"
            stroke="#0088ff"
            strokeWidth="2.5"
            strokeDasharray="45 15 10 15"
            strokeOpacity="0.9"
            style={{
              transformOrigin: "260px 260px",
              animation: "robot-ring-ccw 24s linear infinite",
              filter: "drop-shadow(0 0 6px rgba(0, 136, 255, 0.7))",
            }}
          />

          {/* Ring 3: Inner precision neon ring (CW 16s) */}
          <circle
            cx="260"
            cy="260"
            r="145"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="8 12 16 12"
            strokeOpacity="0.95"
            style={{
              transformOrigin: "260px 260px",
              animation: "robot-ring-cw 16s linear infinite",
              filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))",
            }}
          />

          {/* Outer tick marks */}
          <circle
            cx="260"
            cy="260"
            r="220"
            fill="none"
            stroke="#a5f3fc"
            strokeWidth="1.2"
            strokeDasharray="3 16"
            strokeOpacity="0.75"
          />
        </svg>
      </div>

      {/* ── CONCENTRIC GLOWING FLOOR PLATFORM RINGS ── */}
      <div className="absolute -bottom-8 sm:-bottom-10 left-1/2 -translate-x-1/2 w-[340px] sm:w-[400px] lg:w-[440px] h-[90px] pointer-events-none z-0">
        {/* Floor cyan radial glow */}
        <div
          className="absolute inset-0 rounded-full blur-[22px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0, 229, 255, 0.7) 0%, rgba(0, 140, 255, 0.35) 50%, transparent 80%)",
          }}
        />

        {/* Concentric Elliptical Rings on Floor */}
        <svg
          viewBox="0 0 440 90"
          className="w-full h-full"
          style={{ animation: "robot-platform-glow 4s ease-in-out infinite" }}
        >
          {/* Outer Floor Ellipse */}
          <ellipse
            cx="220"
            cy="45"
            rx="205"
            ry="40"
            fill="none"
            stroke="#00e5ff"
            strokeWidth="2.8"
            strokeOpacity="0.95"
          />
          {/* Middle Floor Ellipse */}
          <ellipse
            cx="220"
            cy="45"
            rx="155"
            ry="30"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeOpacity="0.85"
          />
          {/* Inner Floor Ellipse */}
          <ellipse
            cx="220"
            cy="45"
            rx="105"
            ry="20"
            fill="rgba(0, 229, 255, 0.2)"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeOpacity="0.95"
          />
        </svg>
      </div>

      {/* ── MAIN ROBOT VISUAL (High-Resolution Crisp Mascot Image) ── */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <img
          src="/images/assets/robot-custom-transparent.png"
          alt="TRON AI Robot"
          className="w-full max-h-[440px] sm:max-h-[480px] lg:max-h-[500px] xl:max-h-[540px] object-contain filter drop-shadow-[0_15px_30px_rgba(0,140,255,0.35)]"
        />
      </div>

      {/* ── GLOWING "TRON AI / Your AI Assistant" CAPSULE BADGE ── */}
      <div className="relative z-20 -mt-6 sm:-mt-8 text-center">
        <div
          className="inline-flex flex-col items-center justify-center px-6 py-2 rounded-2xl border shadow-xl"
          style={{
            background: "linear-gradient(135deg, rgba(6, 22, 54, 0.9) 0%, rgba(12, 108, 196, 0.85) 100%)",
            borderColor: "rgba(0, 229, 255, 0.8)",
            boxShadow: "0 8px 24px rgba(0, 140, 255, 0.45), 0 0 16px rgba(0, 229, 255, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.5)",
          }}
        >
          <span className="text-sm sm:text-base font-black tracking-widest text-white font-heading leading-tight drop-shadow-[0_0_10px_rgba(0,229,255,0.9)]">
            TRON AI
          </span>
          <span className="text-[10px] text-cyan-200 font-medium tracking-wide leading-tight mt-0.5">
            Your AI Assistant
          </span>
        </div>
      </div>

    </div>
  );
};

export default TronRobotVideo;
