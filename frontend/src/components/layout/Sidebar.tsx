import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { TronLogo } from '../common/TronLogo';
import {
  Plus,
  MessageCircle,
  Mic,
  GraduationCap,
  Sparkles,
  FileText,
  History,
  Info,
  HelpCircle,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Trash2,
  User,
  Radio,
  Bot,
  Search,
  Terminal,
  Laptop,
  Activity,
  Archive,
  Sliders,
  Share2,
  Key,
  LayoutGrid,
  Briefcase,
  Compass,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    logout,
    t,
    uiLanguage,
    chatSessions,
    activeChatId,
    createNewChat,
    selectChat,
    deleteChat,
  } = useApp();

  // Strict Mode Detection
  const isChatMode = location.pathname.startsWith('/chat');
  const isVoiceMode = location.pathname.startsWith('/voice');
  const isCareerMode =
    location.pathname.startsWith('/career') ||
    location.pathname.startsWith('/interview') ||
    location.pathname.startsWith('/cv') ||
    location.pathname.startsWith('/history');
  const isWorkspaceMode = !isChatMode && !isVoiceMode && !isCareerMode;

  const handleStartNewChat = () => {
    createNewChat();
    navigate('/chat');
  };

  const handleStartNewVoice = () => {
    navigate('/voice');
  };

  const handleStartNewCodingTask = () => {
    navigate('/workspace/agent');
  };

  const handleStartNewInterview = () => {
    navigate('/career/interview/setup');
  };

  return (
    <aside
      className={`
        fixed md:static inset-y-0 left-0 z-40 flex flex-col justify-between
        bg-white/90 backdrop-blur-2xl border-r border-[#E2EEF8] shadow-sm
        transition-all duration-300 ease-in-out select-none
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Top Header with TRON AI logo & collapse button */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-blue-50/80 shrink-0">
          <Link
            to={
              isChatMode
                ? '/chat'
                : isVoiceMode
                ? '/voice'
                : isCareerMode
                ? '/career'
                : '/workspace'
            }
            className="flex items-center gap-2.5 group"
          >
            <TronLogo size="sm" />
            {!collapsed && (
              <div className="flex items-baseline gap-1 font-display tracking-tight font-extrabold text-lg">
                <span className="text-[#071638]">TRON</span>
                <span className="text-[#008CFF] drop-shadow-sm">AI</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-blue-50/80 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* MODE SPECIFIC PRIMARY ACTION */}
        <div className="p-3 shrink-0">
          {isChatMode && (
            <button
              onClick={handleStartNewChat}
              className={`
                w-full flex items-center justify-center gap-2 rounded-xl
                bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white font-semibold
                shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40
                hover:brightness-105 active:scale-[0.98] transition-all duration-200
                ${collapsed ? 'p-2.5' : 'py-2 px-3.5 text-xs font-bold'}
              `}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{uiLanguage === 'ja' ? '新規チャット' : 'New Chat'}</span>}
            </button>
          )}

          {isVoiceMode && (
            <button
              onClick={handleStartNewVoice}
              className={`
                w-full flex items-center justify-center gap-2 rounded-xl
                bg-gradient-to-r from-[#00DFFF] to-[#008CFF] text-slate-900 font-bold
                shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/40
                hover:brightness-105 active:scale-[0.98] transition-all duration-200
                ${collapsed ? 'p-2.5' : 'py-2 px-3.5 text-xs font-bold'}
              `}
            >
              <Radio className="w-4 h-4 shrink-0 animate-pulse" />
              {!collapsed && <span>{uiLanguage === 'ja' ? '音声セッション' : 'New Voice Session'}</span>}
            </button>
          )}

          {isWorkspaceMode && (
            <button
              onClick={handleStartNewCodingTask}
              className={`
                w-full flex items-center justify-center gap-2 rounded-xl
                bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white font-semibold
                shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40
                hover:brightness-105 active:scale-[0.98] transition-all duration-200
                ${collapsed ? 'p-2.5' : 'py-2 px-3.5 text-xs font-bold'}
              `}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{uiLanguage === 'ja' ? '新規コーディング' : 'New Coding Task'}</span>}
            </button>
          )}

          {isCareerMode && (
            <button
              onClick={handleStartNewInterview}
              className={`
                w-full flex items-center justify-center gap-2 rounded-xl
                bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white font-semibold
                shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40
                hover:brightness-105 active:scale-[0.98] transition-all duration-200
                ${collapsed ? 'p-2.5' : 'py-2 px-3.5 text-xs font-bold'}
              `}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{uiLanguage === 'ja' ? '面接を開始' : 'Start Interview'}</span>}
            </button>
          )}
        </div>

        {/* MODE SPECIFIC NAVIGATION BODY */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-3.5">
          {/* ================= 1. CHAT MODE SIDEBAR ================= */}
          {isChatMode && (
            <div>
              {!collapsed && (
                <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                  {uiLanguage === 'ja' ? 'チャット履歴' : 'Chat History'}
                </div>
              )}
              <div className="space-y-1">
                {chatSessions.length === 0 ? (
                  !collapsed && (
                    <p className="px-2.5 py-3 text-xs text-slate-400 italic">No chats yet.</p>
                  )
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`
                        group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all
                        ${session.id === activeChatId
                          ? 'bg-blue-500/10 text-blue-700 font-semibold border border-blue-200/50'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }
                        ${collapsed ? 'justify-center px-0' : ''}
                      `}
                    >
                      <button
                        onClick={() => selectChat(session.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left truncate"
                        title={session.title}
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-blue-500" />
                        {!collapsed && <span className="truncate">{session.title}</span>}
                      </button>

                      {!collapsed && chatSessions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
                          title="Delete Chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= 2. VOICE MODE SIDEBAR ================= */}
          {isVoiceMode && (
            <div>
              {!collapsed && (
                <div className="px-2 pt-1 pb-2 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                  Voice Controls
                </div>
              )}
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-cyan-50/50 border border-cyan-100/70 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Radio className="w-3.5 h-3.5 text-cyan-600" />
                    {!collapsed && <span>Full-Duplex Voice</span>}
                  </div>
                  {!collapsed && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Speak directly in English or Japanese. TRON AI responds with real-time speech synthesis.
                    </p>
                  )}
                </div>

                {!collapsed && (
                  <div className="px-2.5 py-2 text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Microphone API Ready</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 3. WORKSPACE SIDEBAR (DESKTOP AGENT ONLY) ================= */}
          {isWorkspaceMode && (
            <div className="space-y-4">
              {/* DESKTOP AGENT WORKFLOWS */}
              <div>
                {!collapsed && (
                  <div className="px-2.5 pb-1.5 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                    {uiLanguage === 'ja' ? 'ワークスペース' : 'Workspace'}
                  </div>
                )}
                <div className="space-y-0.5">
                  {[
                    {
                      title: uiLanguage === 'ja' ? 'ダッシュボード' : 'Dashboard',
                      path: '/workspace',
                      exact: true,
                      icon: <LayoutGrid className="w-4 h-4 text-blue-600" />,
                    },
                    {
                      title: uiLanguage === 'ja' ? 'コーディング' : 'Coding Agent',
                      path: '/workspace/agent',
                      exact: true,
                      icon: <Terminal className="w-4 h-4 text-indigo-600" />,
                    },
                    {
                      title: uiLanguage === 'ja' ? 'デバイス' : 'Devices',
                      path: '/workspace/agent/devices',
                      icon: <Laptop className="w-4 h-4 text-cyan-600" />,
                    },
                    {
                      title: uiLanguage === 'ja' ? 'タスク' : 'Active Tasks',
                      path: '/workspace/agent/tasks',
                      icon: <Activity className="w-4 h-4 text-emerald-600" />,
                    },
                    {
                      title: uiLanguage === 'ja' ? '実行履歴' : 'Execution History',
                      path: '/workspace/agent/history',
                      icon: <Archive className="w-4 h-4 text-slate-500" />,
                    },
                  ].map((item) => {
                    const isActive = item.exact
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                          ${isActive
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-200/50 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/40'
                          }
                          ${collapsed ? 'justify-center px-0' : ''}
                        `}
                        title={collapsed ? item.title : undefined}
                      >
                        <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                          {item.icon}
                        </span>
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* ACCOUNT GROUP */}
              <div>
                {!collapsed && (
                  <div className="px-2.5 pb-1.5 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                    {uiLanguage === 'ja' ? 'アカウント' : 'Account'}
                  </div>
                )}
                <div className="space-y-0.5">
                  {[
                    {
                      title: uiLanguage === 'ja' ? 'AI 設定' : 'AI Preferences',
                      path: '/settings',
                      icon: <Sliders className="w-4 h-4 text-blue-500" />,
                    },
                    {
                      title: uiLanguage === 'ja' ? '連携機能' : 'Integrations',
                      path: '/settings?tab=integrations',
                      icon: <Share2 className="w-4 h-4 text-cyan-600" />,
                    },
                    {
                      title: uiLanguage === 'ja' ? 'API アクセス' : 'API Access',
                      path: '/settings?tab=api-access',
                      icon: <Key className="w-4 h-4 text-amber-500" />,
                    },
                  ].map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                          ${isActive
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-200/50 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/40'
                          }
                          ${collapsed ? 'justify-center px-0' : ''}
                        `}
                        title={collapsed ? item.title : undefined}
                      >
                        <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                          {item.icon}
                        </span>
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. CAREER CENTER SIDEBAR (CAREER SUITE ONLY) ================= */}
          {isCareerMode && (
            <div>
              {!collapsed && (
                <div className="px-2.5 pb-1.5 text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                  {uiLanguage === 'ja' ? 'キャリアセンター' : 'Career Center'}
                </div>
              )}
              <div className="space-y-0.5">
                {[
                  {
                    title: uiLanguage === 'ja' ? 'ダッシュボード' : 'Dashboard',
                    path: '/career',
                    exact: true,
                    icon: <Briefcase className="w-4 h-4 text-blue-600" />,
                  },
                  {
                    title: uiLanguage === 'ja' ? '求人検索' : 'Job Finder',
                    path: '/career/jobs',
                    icon: <Search className="w-4 h-4 text-cyan-600" />,
                  },
                  {
                    title: uiLanguage === 'ja' ? '面接練習' : 'Interview Practice',
                    path: '/career/interview',
                    icon: <Sparkles className="w-4 h-4 text-blue-500" />,
                  },
                  {
                    title: uiLanguage === 'ja' ? '面接エージェント' : 'Interview Agent',
                    path: '/career/interview-agent',
                    icon: <Bot className="w-4 h-4 text-indigo-500" />,
                  },
                  {
                    title: uiLanguage === 'ja' ? '履歴書管理' : 'CV Manager',
                    path: '/career/cv',
                    icon: <FileText className="w-4 h-4 text-purple-500" />,
                  },
                  {
                    title: uiLanguage === 'ja' ? '面接履歴' : 'Interview History',
                    path: '/career/history',
                    icon: <History className="w-4 h-4 text-slate-500" />,
                  },
                ].map((item) => {
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                        ${isActive
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-200/50 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/40'
                        }
                        ${collapsed ? 'justify-center px-0' : ''}
                      `}
                      title={collapsed ? item.title : undefined}
                    >
                      <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMMON NAVIGATION FOOTER */}
          <div className="pt-3 border-t border-slate-100 space-y-0.5">
            {[
              {
                title: t.nav.home,
                path: '/',
                icon: <Compass className="w-4 h-4" />,
              },
              {
                title: t.sidebar.about,
                path: '/about',
                icon: <Info className="w-4 h-4" />,
              },
              {
                title: t.sidebar.help,
                path: '/help',
                icon: <HelpCircle className="w-4 h-4" />,
              },
              {
                title: t.sidebar.settings,
                path: '/settings',
                icon: <Settings className="w-4 h-4" />,
              },
              ...((user?.role === 'ADMIN' || user?.role === 'OWNER')
                ? [
                    {
                      title: t.sidebar.admin,
                      path: '/admin',
                      icon: <Shield className="w-4 h-4" />,
                    },
                  ]
                : []),
            ].map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-blue-500/10 text-blue-600 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }
                    ${collapsed ? 'justify-center px-0' : ''}
                  `}
                  title={collapsed ? item.title : undefined}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Auth or User Profile */}
      <div className="p-3.5 border-t border-blue-50/80 shrink-0">
        {isAuthenticated && user ? (
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-3'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{user.name}</div>
                  <div className="text-[10px] text-blue-600 font-medium">JLPT {user.jlptLevel || 'N2'}</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title={t.sidebar.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div>
            {!collapsed ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/auth?mode=signin"
                  className="px-2.5 py-1.5 text-center text-xs font-semibold rounded-xl bg-white border border-[#E2EEF8] text-slate-700 hover:bg-blue-50/60 hover:text-blue-600 shadow-2xs transition-all"
                >
                  {t.auth.signInBtn}
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="px-2.5 py-1.5 text-center text-xs font-semibold rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white hover:brightness-105 shadow-2xs shadow-blue-500/20 transition-all"
                >
                  {t.auth.signUpBtn}
                </Link>
              </div>
            ) : (
              <Link
                to="/auth?mode=signin"
                className="flex items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title={t.auth.signInBtn}
              >
                <User className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
