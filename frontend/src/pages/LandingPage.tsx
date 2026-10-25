import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeatureCardGrid } from '../components/landing/FeatureCardGrid';
import { StatsRibbon } from '../components/landing/StatsRibbon';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { IntelligenceSection } from '../components/landing/IntelligenceSection';
import { DesktopAgentSection } from '../components/landing/DesktopAgentSection';
import { AiModelsSection } from '../components/landing/AiModelsSection';
import { PricingSection } from '../components/landing/PricingSection';
import { AboutSection } from '../components/landing/AboutSection';
import { HelpSection } from '../components/landing/HelpSection';
import { CtaSection } from '../components/landing/CtaSection';
import { LandingFooter } from '../components/landing/LandingFooter';

interface LandingPageProps {
  defaultSection?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ defaultSection }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();

  const handleSignIn = () => {
    navigate('/auth?mode=signin');
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/workspace');
    } else {
      navigate('/auth?mode=signup');
    }
  };

  useEffect(() => {
    if (defaultSection) {
      const el = document.getElementById(defaultSection);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [defaultSection]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased relative selection:bg-blue-500/20 selection:text-blue-600">
      {/* Sticky Translucent Navigation */}
      <LandingNavbar
        onSignIn={handleSignIn}
        onGetStarted={handleGetStarted}
      />

      {/* Main Landing Page Sections */}
      <main>
        {/* 1. Cinematic Hero with 2D Robot Mascot and 5 Floating Cards */}
        <HeroSection onStartForFree={handleGetStarted} />

        {/* 2. Five Primary Feature Cards Grid */}
        <FeatureCardGrid />

        {/* 3. Verified Capabilities & Information Ribbon */}
        <StatsRibbon />

        {/* 4. How TRON AI Works */}
        <HowItWorksSection />

        {/* 5. Hybrid Intelligence Architecture */}
        <IntelligenceSection />

        {/* 6. Desktop Coding Agent Showcase */}
        <DesktopAgentSection />

        {/* 7. Supported AI Models */}
        <AiModelsSection />

        {/* 8. Pricing Section with 'Plans Coming Soon' */}
        <PricingSection onGetStarted={handleGetStarted} />

        {/* 9. About Section */}
        <AboutSection />

        {/* 10. Help & FAQ Section */}
        <HelpSection />

        {/* 11. Final Call to Action */}
        <CtaSection onGetStarted={handleGetStarted} />
      </main>

      {/* Unified Multilingual Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
