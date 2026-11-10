import React from "react";
import { GraduationCap, Briefcase, TrendingUp } from "lucide-react";

interface FloatingHologramIconsProps {
  mouseParallax?: { x: number; y: number };
}

export const FloatingHologramIcons: React.FC<FloatingHologramIconsProps> = ({
  mouseParallax = { x: 0, y: 0 },
}) => {
  const px = mouseParallax.x * 12;
  const py = mouseParallax.y * 8;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      <style>{`
        @keyframes float-hologram-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(1.5deg); }
        }
        @keyframes float-hologram-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-9px) rotate(-1.5deg); }
        }
        @keyframes float-hologram-3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes hologram-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.6)) drop-shadow(0 0 20px rgba(0, 140, 255, 0.3)); }
          50% { filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.9)) drop-shadow(0 0 28px rgba(0, 140, 255, 0.55)); }
        }
      `}</style>

      {/* ── ICON 1: Graduation Cap 🎓 (Top-Left of Globe) ── */}
      <div
        className="absolute top-[8%] left-[2%] sm:left-[6%] transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${px * 0.9}px, ${py * 0.9}px)`,
        }}
      >
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(6, 40, 90, 0.65) 0%, rgba(0, 195, 255, 0.25) 100%)",
            borderColor: "rgba(0, 229, 255, 0.75)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0, 102, 255, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5)",
            animation: "float-hologram-1 4.8s ease-in-out infinite, hologram-glow-pulse 4s ease-in-out infinite",
          }}
        >
          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2] drop-shadow-[0_0_8px_rgba(0,229,255,0.9)]" />
        </div>
      </div>

      {/* ── ICON 2: Briefcase 💼 (Top-Right of Globe) ── */}
      <div
        className="absolute top-[2%] right-[18%] sm:right-[15%] transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${px * 1.1}px, ${py * 1.1}px)`,
        }}
      >
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(6, 40, 90, 0.65) 0%, rgba(0, 195, 255, 0.25) 100%)",
            borderColor: "rgba(0, 229, 255, 0.75)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0, 102, 255, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5)",
            animation: "float-hologram-2 5.4s ease-in-out infinite 0.8s, hologram-glow-pulse 4s ease-in-out infinite 1s",
          }}
        >
          <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2] drop-shadow-[0_0_8px_rgba(0,229,255,0.9)]" />
        </div>
      </div>

      {/* ── ICON 3: Growth Chart 📈 (Right of Globe) ── */}
      <div
        className="absolute top-[38%] right-[0%] sm:right-[1%] transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${px * 1.3}px, ${py * 1.3}px)`,
        }}
      >
        <div
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(6, 40, 90, 0.65) 0%, rgba(0, 195, 255, 0.25) 100%)",
            borderColor: "rgba(0, 229, 255, 0.75)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0, 102, 255, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.5)",
            animation: "float-hologram-3 5.0s ease-in-out infinite 1.6s, hologram-glow-pulse 4s ease-in-out infinite 2s",
          }}
        >
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.2] drop-shadow-[0_0_8px_rgba(0,229,255,0.9)]" />
        </div>
      </div>
    </div>
  );
};

export default FloatingHologramIcons;

