import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { LandingSecondaryNav } from "../components/landing/LandingSecondaryNav";
import { DemoVideoModal } from "../components/landing/DemoVideoModal";

interface LandingPageProps {
  defaultSection?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ defaultSection }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleSignIn = () => {
    navigate("/auth?mode=signin");
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      navigate("/auth?mode=signup&returnTo=%2Fchat");
    }
  };

  useEffect(() => {
    if (defaultSection) {
      const el = document.getElementById(defaultSection);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [defaultSection]);

  // Robust HTML5 video autoplay initializer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay fallback (muted plays automatically on user touch/visibility)
      });
    }
  }, []);

  return (
    <div className="landing-page relative min-h-screen min-h-[100dvh] overflow-x-hidden lg:overflow-hidden isolate bg-[#EEFAFF] text-slate-900 font-sans antialiased selection:bg-cyan-500/20 selection:text-blue-600">
      {/* ── MASTER CINEMATIC VIDEO BACKGROUND (Single Layer, No Duplicates) ── */}
      <video
        ref={videoRef}
        className="landing-background-video fixed lg:absolute inset-0 w-full h-full object-cover object-[center_32%] lg:object-center pointer-events-none z-0"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/images/tron-ai-hero-poster.webp"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/videos/tron-ai-hero.mp4" type="video/mp4" />
      </video>

      {/* ── SUBTLE CONTRAST GRADIENTS (Preserves bright TRON AI aesthetic without dimming the robot or globe) ── */}
      {/* Left side gentle scrim: guarantees crystal-clear headline & body contrast */}
      <div
        className="absolute inset-y-0 left-0 w-full lg:w-[48%] pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to right, rgba(238, 250, 255, 0.72) 0%, rgba(238, 250, 255, 0.42) 50%, rgba(238, 250, 255, 0.08) 85%, transparent 100%)",
        }}
      />
      {/* Bottom subtle floor gradient: anchors the Quick Launch bar and bottom dock */}
      <div
        className="absolute inset-x-0 bottom-0 h-28 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to top, rgba(238, 250, 255, 0.65) 0%, rgba(238, 250, 255, 0.15) 60%, transparent 100%)",
        }}
      />

      {/* ── FOREGROUND USER INTERFACE LAYER ── */}
      <div className="landing-content relative z-10 flex flex-col min-h-screen min-h-[100dvh] justify-between">
        {/* Floating Translucent Futuristic Navigation */}
        <LandingNavbar onSignIn={handleSignIn} onGetStarted={handleGetStarted} />

        {/* Main Single-Viewport Cinematic Experience */}
        <main className="w-full flex-1 flex flex-col justify-between min-w-0">
          <HeroSection
            onStartForFree={handleGetStarted}
            onOpenDemos={() => navigate("/career/interview")}
          />
        </main>

        {/* Secondary Bottom Dock Navigation */}
        <LandingSecondaryNav onOpenDemos={() => navigate("/career/interview")} />
      </div>

      {/* Interactive Platform Demo Modal */}
      <DemoVideoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
