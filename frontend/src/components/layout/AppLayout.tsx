import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../common/ToastContainer';
import { UltraLimitModal } from '../common/UltraLimitModal';
import { AdvancedAiSettingsModal } from '../settings/AdvancedAiSettingsModal';
import { MobileBottomNav } from '../common/MobileBottomNav';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar automatically on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex bg-[#F8FCFF] text-slate-800 overflow-hidden font-sans">
      {/* Sci-fi Chamber Background with subtle overlay */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-30 select-none transition-opacity duration-700"
        style={{ backgroundImage: `url('/assets/tron-bg.jpg')` }}
      />

      {/* Perspective Floor Grid Overlay */}
      <div className="fixed inset-0 sci-fi-perspective-grid opacity-35 pointer-events-none" />

      {/* Ambient Sci-Fi Glows */}
      <div className="fixed -top-40 left-1/3 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/10 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-400/10 via-cyan-300/10 to-transparent blur-3xl pointer-events-none" />

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar (z-50 overlays mobile bottom navigation smoothly) */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 h-[100dvh] max-h-[100dvh] overflow-hidden md:overflow-y-auto">
        <TopBar onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)} />
        <main className="flex-1 p-2 sm:p-4 md:p-8 flex flex-col min-w-0 min-h-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar (< lg / < md) */}
      <MobileBottomNav />

      {/* Modals & Overlays */}
      <UltraLimitModal />
      <AdvancedAiSettingsModal />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
};
