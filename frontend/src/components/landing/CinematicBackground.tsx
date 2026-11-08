import React, { useEffect, useRef, useCallback, useState, memo } from "react";

interface CinematicBackgroundProps {
  mousePosition: { x: number; y: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  opacityDir: number;
  color: string;
}

const PARTICLE_COLORS = [
  "rgba(0, 229, 255, ",   // cyan neon
  "rgba(56, 189, 248, ",  // sky-400
  "rgba(14, 165, 233, ",  // sky-500
  "rgba(99, 102, 241, ",  // indigo
  "rgba(255, 255, 255, ", // white spark
];

// Canvas particle system
function useParticleCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  reducedMotion: boolean
) {
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const visibleRef = useRef(true);

  const createParticles = useCallback((w: number, h: number): Particle[] => {
    const isMobile = w < 768;
    const count = isMobile ? 16 : 32;
    return Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: 1 + Math.random() * 2,
      opacity: 0.15 + Math.random() * 0.5,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let h = (canvas.height = canvas.offsetHeight || window.innerHeight);
    particlesRef.current = createParticles(w, h);

    const onResize = () => {
      if (!canvas) return;
      w = canvas.width = canvas.offsetWidth || window.innerWidth;
      h = canvas.height = canvas.offsetHeight || window.innerHeight;
      particlesRef.current = createParticles(w, h);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const onVisibility = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    let lastTime = performance.now();
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (!visibleRef.current) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        p.opacity += p.opacityDir * 0.006;
        if (p.opacity > 0.75) {
          p.opacity = 0.75;
          p.opacityDir = -1;
        } else if (p.opacity < 0.1) {
          p.opacity = 0.1;
          p.opacityDir = 1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity.toFixed(2)})`;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = p.radius * 2.5;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasRef, createParticles, reducedMotion]);
}

const KEYFRAMES_STYLE = `
  @keyframes tron-stream-h1 {
    0% { transform: translateX(-100%); opacity: 0; }
    25% { opacity: 0.65; }
    75% { opacity: 0.65; }
    100% { transform: translateX(250%); opacity: 0; }
  }
  @keyframes tron-ceiling-pulse {
    0%, 100% { opacity: 0.75; transform: scaleX(1); }
    50% { opacity: 1; transform: scaleX(1.02); }
  }
`;

const CinematicBackgroundComponent: React.FC<CinematicBackgroundProps> = ({
  mousePosition,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useParticleCanvas(canvasRef, reducedMotion);

  // Subtle Parallax offsets
  const px = mousePosition.x * 10;
  const py = mousePosition.y * 6;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <style>{KEYFRAMES_STYLE}</style>

      {/* ── LAYER 1: Full-Fidelity Futuristic Digital Laboratory Chamber ── */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/assets/tron-hero-bg.jpg')",
          backgroundPosition: "center 20%",
          opacity: 0.98,
          transform: `scale(1.03) translate(${px * 0.25}px, ${py * 0.2}px)`,
        }}
      />

      {/* ── LAYER 2: Overhead Luminous Curved Arch Ceiling Glow ── */}
      <div
        className="absolute -top-36 left-1/2 -translate-x-1/2 w-[1200px] h-[360px] rounded-full blur-[75px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0, 229, 255, 0.5) 0%, rgba(56, 189, 248, 0.25) 45%, transparent 75%)",
          animation: !reducedMotion ? "tron-ceiling-pulse 6s ease-in-out infinite" : undefined,
        }}
      />

      {/* ── LAYER 3: Animated Continuous Energy Streams ── */}
      {!reducedMotion && (
        <div className="absolute inset-0 overflow-hidden opacity-35 max-w-full pointer-events-none">
          <div
            className="absolute top-[26%] left-0 w-60 sm:w-80 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            style={{ animation: "tron-stream-h1 7s linear infinite" }}
          />
          <div
            className="absolute top-[52%] left-0 w-72 sm:w-[450px] h-[1.5px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            style={{ animation: "tron-stream-h1 9s linear infinite 2.5s" }}
          />
          <div
            className="absolute top-[75%] left-0 w-64 sm:w-96 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
            style={{ animation: "tron-stream-h1 8s linear infinite 5s" }}
          />
        </div>
      )}

      {/* ── LAYER 4: Living Floating Digital Particles ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 3 }}
      />

      {/* ── LAYER 5: Gentle Left-side Scrim for Optimal Headline Contrast ── */}
      <div
        className="absolute inset-y-0 left-0 w-full lg:w-[46%] pointer-events-none"
        style={{
          background: "linear-gradient(to right, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 55%, transparent 100%)",
        }}
      />
    </div>
  );
};

export const CinematicBackground = memo(CinematicBackgroundComponent);
export default CinematicBackground;
