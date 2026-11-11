import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminTab } from '../../../types/admin';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  lang: 'en' | 'ja';
  onLanguageChange: (lang: 'en' | 'ja') => void;
  isLive: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  user: any;
  onLogout: () => void;
  onReturnToApp: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  lang,
  onLanguageChange,
  isLive,
  onRefresh,
  isRefreshing,
  user,
  onLogout,
  onReturnToApp,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        lang={lang}
        userRole={user?.role}
        onReturnToApp={onReturnToApp}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AdminTopBar
          activeTab={activeTab}
          lang={lang}
          onLanguageChange={onLanguageChange}
          isLive={isLive}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
          user={user}
          onLogout={onLogout}
          onReturnToApp={onReturnToApp}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
