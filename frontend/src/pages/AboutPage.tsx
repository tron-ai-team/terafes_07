import React, { useEffect } from 'react';
import { AboutHero } from '../components/about/AboutHero';
import { BrandPillarsGrid } from '../components/about/BrandPillarsGrid';
import { TrustRibbon } from '../components/about/TrustRibbon';
import { WhyWeBuiltSection } from '../components/about/WhyWeBuiltSection';
import { TeamSection } from '../components/about/TeamSection';
import { ClosingBrandStatement } from '../components/about/ClosingBrandStatement';
import { useApp } from '../context/AppContext';

export const AboutPage: React.FC = () => {
  const { selectedLanguage } = useApp();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 md:space-y-12 select-none py-2 pb-16 animate-in fade-in duration-500">
      {/* 1. Hero Introduction */}
      <AboutHero />

      {/* 2. Core Pillars: The Meaning of TRON, Our Mission, Our Vision */}
      <BrandPillarsGrid />

      {/* 3. Core Trust & Practical Value Ribbon */}
      <TrustRibbon />

      {/* 4. Why We Built TRON AI & Four Core Capabilities */}
      <WhyWeBuiltSection />

      {/* 5. Meet Our Team (4 Cards with Real Photos & Exact Mapping) */}
      <TeamSection />

      {/* 6. Closing Brand Statement */}
      <ClosingBrandStatement />
    </div>
  );
};

export default AboutPage;