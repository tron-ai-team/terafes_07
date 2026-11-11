import React from 'react';
import {
  LayoutDashboard,
  Users,
  Gauge,
  BarChart3,
  Cpu,
  Coins,
  ShieldCheck,
  FileText,
  Megaphone,
  Activity,
  Settings,
  Crown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { AdminTab } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  lang: 'en' | 'ja';
  userRole?: string;
  onReturnToApp: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  lang,
  userRole = 'OWNER',
  onReturnToApp,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const isOwner = userRole.toUpperCase() === 'OWNER';

  const navItems = [
    { id: 'overview' as AdminTab, label: t.sidebar.overview, icon: LayoutDashboard },
    { id: 'users' as AdminTab, label: t.sidebar.userManagement, icon: Users, badge: 'V1' },
    { id: 'quotas' as AdminTab, label: t.sidebar.quotas, icon: Gauge, badge: 'V1' },
    { id: 'analytics' as AdminTab, label: t.sidebar.analytics, icon: BarChart3, badge: 'V2' },
    { id: 'providers' as AdminTab, label: t.sidebar.providers, icon: Cpu, badge: 'V2' },
    { id: 'costs' as AdminTab, label: t.sidebar.costs, icon: Coins, badge: 'V2' },
    { id: 'security' as AdminTab, label: t.sidebar.security, icon: ShieldCheck, badge: 'V3' },
    { id: 'audit' as AdminTab, label: t.sidebar.auditLogs, icon: FileText, badge: 'V3' },
    { id: 'announcements' as AdminTab, label: t.sidebar.announcements, icon: Megaphone, badge: 'V3' },
    { id: 'health' as AdminTab, label: t.sidebar.systemHealth, icon: Activity },
    { id: 'settings' as AdminTab, label: t.sidebar.settings, icon: Settings },
  ];

  const handleItemClick = (id: AdminTab) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 shadow-xs transition-all duration-300 ease-in-out
        md:static md:translate-x-0
        ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'md:w-20' : 'md:w-64'}
      `}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-sm shadow-blue-500/20 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <span className="text-cyan-400 font-extrabold text-sm tracking-tighter">TRON</span>
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 animate-in fade-in duration-200">
              <span className="font-bold text-sm tracking-tight text-slate-900 leading-tight truncate">TRON AI</span>
              <span className="text-[11px] font-medium text-blue-600 truncate">Admin Control Center</span>
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title={collapsed ? t.sidebar.expand : t.sidebar.collapse}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }
                ${collapsed ? 'justify-center px-0' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate text-left">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Controls & Role Badge */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {/* Role Badge Container matching mockup */}
        <div
          className={`
            flex items-center gap-2.5 p-2.5 rounded-xl border transition-all
            ${
              isOwner
                ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
            }
            ${collapsed ? 'justify-center p-2' : ''}
          `}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isOwner ? 'bg-amber-400 text-amber-950 shadow-xs' : 'bg-blue-500 text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight truncate">
                {isOwner ? 'Owner' : 'Admin'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">
                {isOwner ? 'Full Access' : 'Manage Access'}
              </div>
            </div>
          )}
        </div>

        {/* Return to App Button */}
        <button
          type="button"
          onClick={onReturnToApp}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors
            ${collapsed ? 'justify-center px-0' : ''}
          `}
          title={t.sidebar.returnToApp}
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
          {!collapsed && <span className="truncate">{t.sidebar.returnToApp}</span>}
        </button>
      </div>
    </aside>
  );
};
