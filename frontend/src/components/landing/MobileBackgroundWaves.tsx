import React from "react";

/**
 * MobileBackgroundWaves
 * Renders subtle, elegant light cyan and icy blue futuristic wave curves
 * along the left and right edges on mobile viewports (< lg), matching the
 * mobile reference screenshot while leaving desktop untouched.
 */
export const MobileBackgroundWaves: React.FC = () => {
  return (
    <div
      className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none z-0 select-none"
      aria-hidden="true"
    >
      {/* ── LEFT CURVED WAVE RIBBON ── */}
      <svg
        viewBox="0 0 400 900"
        className="absolute -left-12 top-0 h-[1000px] w-auto opacity-45"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="left-wave-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#00d4ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="left-wave-grad-2" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d="M-50,0 C120,180 80,360 -20,520 C-80,620 -40,780 40,900 L-100,900 L-100,0 Z"
          fill="url(#left-wave-grad-1)"
        />
        <path
          d="M-60,40 C140,220 100,380 -10,540 C-70,640 -30,790 50,900"
          stroke="url(#left-wave-grad-2)"
          strokeWidth="1.8"
        />
      </svg>

      {/* ── RIGHT CURVED WAVE RIBBON ── */}
      <svg
        viewBox="0 0 400 900"
        className="absolute -right-12 top-48 h-[900px] w-auto opacity-45"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="right-wave-grad-1" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="right-wave-grad-2" x1="100%" y1="0%" x2="0%" y2="90%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d="M450,0 C300,160 330,340 430,480 C480,560 450,720 370,850 L500,850 L500,0 Z"
          fill="url(#right-wave-grad-1)"
        />
        <path
          d="M440,30 C290,190 320,360 420,500 C470,580 440,730 360,860"
          stroke="url(#right-wave-grad-2)"
          strokeWidth="1.8"
        />
      </svg>

      {/* ── SOFT CYAN AMBIENT GLOW BLOBS ── */}
      <div
        className="absolute top-24 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full blur-[80px]"
        style={{
          background:
            "radial-gradient(circle, rgba(0, 212, 255, 0.16) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 75%)",
        }}
      />
      <div
        className="absolute top-[420px] left-1/2 -translate-x-1/2 w-[380px] h-[260px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(0, 229, 255, 0.2) 0%, rgba(56, 189, 248, 0.1) 45%, transparent 70%)",
        }}
      />
    </div>
  );
};

export default MobileBackgroundWaves;
