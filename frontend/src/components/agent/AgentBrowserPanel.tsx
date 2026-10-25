import React from 'react';
import { AgentBrowserEvent, BrowserSessionStatus, AgentControlMode } from '../../types/desktopAgent';
import {
  Globe,
  RefreshCw,
  Eye,
  ShieldCheck,
  Image as ImageIcon,
  UserCheck,
  Play,
  Monitor,
  Activity,
  AlertCircle,
} from 'lucide-react';

interface AgentBrowserPanelProps {
  browser?: AgentBrowserEvent;
  controlMode?: AgentControlMode;
  isWaitingUser?: boolean;
  onTakeControl?: () => void;
  onResumeAgent?: () => void;
  className?: string;
}

export const AgentBrowserPanel: React.FC<AgentBrowserPanelProps> = ({
  browser,
  controlMode,
  isWaitingUser = false,
  onTakeControl,
  onResumeAgent,
  className = '',
}) => {
  const currentUrl = browser?.currentUrl || '';
  const pageTitle = browser?.pageTitle || (currentUrl ? 'Web Application' : 'No Active Session');
  const lastAction = browser?.detail || browser?.event || 'Browser initialized';
  const rawShot = browser?.screenshotBase64;
  const hasScreenshot = Boolean(rawShot && rawShot.trim().length > 0);
  const screenshot = hasScreenshot
    ? rawShot!.startsWith('data:')
      ? rawShot!
      : `data:image/png;base64,${rawShot}`
    : browser?.screenshotUrl;

  // Determine Canonical Browser Session Status:
  // Active | Waiting for User | Agent Controlled | User Controlled | Closed
  const computeSessionStatus = (): BrowserSessionStatus => {
    if (!currentUrl && !browser) return 'CLOSED';
    if (isWaitingUser) return 'WAITING_USER';
    if (controlMode === 'MANUAL') return 'USER_CONTROLLED';
    if (browser?.browserStatus === 'navigating' || browser?.browserStatus === 'clicking' || browser?.browserStatus === 'verifying') {
      return 'AGENT_CONTROLLED';
    }
    if (currentUrl) return 'ACTIVE';
    return 'CLOSED';
  };

  const sessionStatus = computeSessionStatus();

  const getSessionBadge = () => {
    switch (sessionStatus) {
      case 'WAITING_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            User Action Required
          </span>
        );
      case 'USER_CONTROLLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300 shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
            User Controlled
          </span>
        );
      case 'AGENT_CONTROLLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin" />
            Agent Controlled
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-700" />
            Active Session
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            Closed
          </span>
        );
    }
  };

  return (
    <div className={`flex flex-col rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Browser Session Chrome Header */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-900">Browser Session</h3>
            {getSessionBadge()}
          </div>

          {/* Direct Handoff Controls */}
          {controlMode === 'MANUAL' ? (
            <button
              onClick={onResumeAgent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Resume Agent</span>
            </button>
          ) : isWaitingUser ? (
            <button
              onClick={onTakeControl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <UserCheck className="w-3 h-3" />
              <span>Take Browser Control</span>
            </button>
          ) : null}
        </div>

        {/* Address Bar & Metadata */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 flex-1 shadow-2xs overflow-hidden">
            <span className="text-slate-400 font-bold select-none text-[11px]">URL</span>
            <span className="truncate flex-1 font-semibold text-slate-800">
              {currentUrl || 'about:blank (no URL loaded)'}
            </span>
          </div>
        </div>

        {/* Page Title & Last Action */}
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 flex-wrap">
          <span className="truncate max-w-sm">
            <strong className="text-slate-700">Page:</strong> {pageTitle}
          </span>
          <span className="truncate max-w-sm text-slate-600 font-mono">
            <strong className="text-slate-700 font-sans">Last Action:</strong> {lastAction}
          </span>
        </div>
      </div>

      {/* Manual Login / Handoff Banner */}
      {isWaitingUser && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950">Login Required: </span>
              <span className="font-semibold text-amber-900">Please sign in using the browser window, then continue.</span>
              <span className="block text-[11px] text-amber-700">For your security, never enter or transmit passwords in the TRON chat.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onTakeControl && controlMode !== 'MANUAL' && (
              <button
                onClick={onTakeControl}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0 transition-colors cursor-pointer"
              >
                Take Browser Control
              </button>
            )}
            {onResumeAgent && (
              <button
                onClick={onResumeAgent}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shrink-0 transition-colors cursor-pointer"
              >
                Resume Agent
              </button>
            )}
          </div>
        </div>
      )}

      {/* Browser Viewport */}
      <div className="relative min-h-[280px] max-h-[460px] bg-slate-900/5 flex items-center justify-center p-3 overflow-hidden">
        {screenshot ? (
          <img
            src={screenshot}
            alt={pageTitle}
            className="w-full h-auto max-h-[430px] object-contain rounded-xl border border-slate-200 shadow-md bg-white"
          />
        ) : (
          <div className="text-center p-8 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-200/80 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <ImageIcon className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-600">
              {currentUrl ? 'No browser screenshot captured yet' : 'Browser execution currently idle'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              {currentUrl
                ? 'When the TRON Desktop Agent captures a verification screenshot via Playwright, the verified canonical base64 frame will display here.'
                : 'Browser automation execution is currently unavailable or awaiting a browser navigation tool command from the active agent task.'}
            </p>
          </div>
        )}
      </div>

      {/* Browser Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-mono text-[10px] text-slate-400">
          Canonical Source: BROWSER_EVENT.screenshotBase64
        </span>
        <span className="font-semibold text-slate-600">
          {screenshot ? 'Screenshot Verified' : 'Awaiting Screenshot Capture'}
        </span>
      </div>
    </div>
  );
};
