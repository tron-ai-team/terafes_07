import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../common/ToastContainer';
import { UltraLimitModal } from '../common/UltraLimitModal';
import { AdvancedAiSettingsModal } from '../settings/AdvancedAiSettingsModal';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

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

      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TopBar />
        <main className="flex-1 p-6 md:p-8 flex flex-col">
          <Outlet />
        </main>
      </div>

      {/* Modals & Overlays */}
      <UltraLimitModal />
      <AdvancedAiSettingsModal />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
};
