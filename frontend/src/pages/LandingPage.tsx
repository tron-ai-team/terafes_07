import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { LandingSecondaryNav } from "../components/landing/LandingSecondaryNav";
import { LandingMobileBottomNav } from "../components/landing/LandingMobileBottomNav";
import { MobileBackgroundWaves } from "../components/landing/MobileBackgroundWaves";
import { DemoVideoModal } from "../components/landing/DemoVideoModal";

interface LandingPageProps {
  defaultSection?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ defaultSection }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
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

  return (
    <div className="landing-page relative min-h-screen min-h-[100dvh] overflow-x-hidden overflow-y-auto lg:overflow-hidden isolate bg-[#EEFAFF] text-slate-900 font-sans antialiased selection:bg-cyan-500/20 selection:text-blue-600">
      {/* ── MOBILE BACKGROUND WAVES (Clean subtle cyan/blue waves, mobile-only) ── */}
      <MobileBackgroundWaves />

      {/* ── DESKTOP SUBTLE CONTRAST GRADIENTS (Desktop only, preserves bright aesthetic) ── */}
      {/* Left side gentle scrim: guarantees crystal-clear headline & body contrast on desktop */}
      <div
        className="hidden lg:block absolute inset-y-0 left-0 w-[48%] pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to right, rgba(238, 250, 255, 0.72) 0%, rgba(238, 250, 255, 0.42) 50%, rgba(238, 250, 255, 0.08) 85%, transparent 100%)",
        }}
      />
      {/* Bottom subtle floor gradient: anchors the desktop bottom dock */}
      <div
        className="hidden lg:block absolute inset-x-0 bottom-0 h-28 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to top, rgba(238, 250, 255, 0.65) 0%, rgba(238, 250, 255, 0.15) 60%, transparent 100%)",
        }}
      />

      {/* ── FOREGROUND USER INTERFACE LAYER ── */}
      <div className="landing-content relative z-10 flex flex-col min-h-screen min-h-[100dvh] justify-between pb-[calc(3.4rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Floating Translucent Futuristic Navigation */}
        <LandingNavbar onSignIn={handleSignIn} onGetStarted={handleGetStarted} />

        {/* Main Experience (HeroSection houses the master single video element) */}
        <main className="w-full flex-1 flex flex-col justify-between min-w-0">
          <HeroSection
            onStartForFree={handleGetStarted}
            onOpenDemos={() => navigate("/career/interview")}
          />
        </main>

        {/* Secondary Bottom Dock Navigation (Desktop only) */}
        <div className="hidden lg:block">
          <LandingSecondaryNav onOpenDemos={() => navigate("/career/interview")} />
        </div>
      </div>

      {/* ── FIXED MOBILE BOTTOM NAVIGATION BAR (< lg) ── */}
      <LandingMobileBottomNav />

      {/* Interactive Platform Demo Modal */}
      <DemoVideoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;
