import React, { useState } from 'react';
import {
  Menu,
  Globe,
  Bell,
  RefreshCw,
  LogOut,
  User as UserIcon,
  ChevronDown,
  ExternalLink,
  Shield,
  Check,
} from 'lucide-react';
import { AdminTab } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';
import { DemoModeBanner } from '../common/DemoModeBanner';

interface AdminTopBarProps {
  activeTab: AdminTab;
  lang: 'en' | 'ja';
  onLanguageChange: (lang: 'en' | 'ja') => void;
  isLive: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onToggleMobileSidebar: () => void;
  user: any;
  onLogout: () => void;
  onReturnToApp: () => void;
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  activeTab,
  lang,
  onLanguageChange,
  isLive,
  onRefresh,
  isRefreshing,
  onToggleMobileSidebar,
  user,
  onLogout,
  onReturnToApp,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
    overview: { title: t.overview.title, subtitle: t.overview.subtitle },
    users: { title: t.users.title, subtitle: t.users.subtitle },
    quotas: { title: t.quotas.title, subtitle: t.quotas.subtitle },
    analytics: { title: t.analytics.title, subtitle: t.analytics.subtitle },
    providers: { title: t.providers.title, subtitle: t.providers.subtitle },
    costs: { title: t.costs.title, subtitle: t.costs.subtitle },
    security: { title: t.security.title, subtitle: t.security.subtitle },
    audit: { title: t.audit.title, subtitle: t.audit.subtitle },
    announcements: { title: t.announcements.title, subtitle: t.announcements.subtitle },
    health: { title: t.health.title, subtitle: t.health.subtitle },
    settings: { title: t.settings.title, subtitle: t.settings.subtitle },
  };

  const current = tabTitles[activeTab] || tabTitles.overview;

  const demoNotifications = [
    { id: 1, title: 'Live Spring API probe verified', time: '2m ago', type: 'success' },
    { id: 2, title: 'Groq provider latency normal (240ms)', time: '14m ago', type: 'info' },
    { id: 3, title: 'User quota override set for Kenji Sato', time: '1h ago', type: 'info' },
  ];

  return (
    <header className="h-16 px-4 md:px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 relative z-20">
      {/* Left: Mobile hamburger & Active Section Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
            {current.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 truncate leading-tight mt-0.5">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Demo Mode / Live API indicator badge */}
        <DemoModeBanner isLive={isLive} />

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-all shadow-2xs"
          title={isRefreshing ? t.header.refreshing : t.header.refresh}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Language selector dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setLangDropdownOpen(!langDropdownOpen);
              setUserDropdownOpen(false);
              setNotifDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="uppercase">{lang}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  onLanguageChange('en');
                  setLangDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left ${
                  lang === 'en' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>English (US)</span>
                {lang === 'en' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onLanguageChange('ja');
                  setLangDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left ${
                  lang === 'ja' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>日本語 (JA)</span>
                {lang === 'ja' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifDropdownOpen(!notifDropdownOpen);
              setUserDropdownOpen(false);
              setLangDropdownOpen(false);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-all relative shadow-2xs"
            title={t.header.notifications}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">{t.header.notifications}</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  3 new
                </span>
              </div>
              <div className="py-2 space-y-2">
                {demoNotifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs">
                    <p className="font-medium text-slate-800">{n.title}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin user avatar & menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserDropdownOpen(!userDropdownOpen);
              setLangDropdownOpen(false);
              setNotifDropdownOpen(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs bg-white"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'T'}
            </div>
            <span className="hidden lg:inline text-xs font-semibold text-slate-800 max-w-[120px] truncate">
              {user?.displayName || 'TRON Admin'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.displayName || 'Admin'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'owner@tronai.tech'}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {user?.role || 'OWNER'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  onReturnToApp();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                {t.sidebar.returnToApp}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t.header.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
