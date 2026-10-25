import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  Laptop,
  Activity,
  Archive,
  ArrowRight,
  Sliders,
  Share2,
  Key,
  Cpu,
  Cloud,
  MessageSquare,
  Briefcase,
  FileText,
  Plus,
  Globe,
  Sparkles,
} from 'lucide-react';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { DesktopAgentDevice } from '../types/desktopAgent';
import { PairDeviceModal } from '../components/agent/PairDeviceModal';
import { LocalSetupHelpModal } from '../components/agent/LocalSetupHelpModal';
import {
  DeviceCard,
  EmptyState,
  SectionHeader,
  StatusBadge,
} from '../components/common/StatusDesignSystem';

export const WorkspaceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DesktopAgentDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isSetupHelpOpen, setIsSetupHelpOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchDevices() {
      try {
        const list = await desktopAgentClient.getDevices();
        if (isMounted) setDevices(list);
      } catch {
        // Fallback empty
      } finally {
        if (isMounted) setLoadingDevices(false);
      }
    }
    void fetchDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  const onlineDevices = devices.filter((d) => d.status === 'ONLINE');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Compact Product Header (PART 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              TRON Workspace
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
              Desktop Platform
            </span>
          </div>
          <p className="text-xs text-slate-500">
            AI work across the web and your connected computers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/workspace/agent')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Terminal className="w-4 h-4" />
          <span>New Coding Task</span>
        </button>
      </div>

      {/* SECTION 1: WEB / CLOUD (PART 2) */}
      <div className="space-y-3.5">
        <SectionHeader
          title="WEB / CLOUD"
          subtitle="Server-side AI capabilities accessible without local setup"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: AI Chat */}
          <Link
            to="/chat"
            className="p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  AI Chat
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  General conversation, reasoning, code explanations, and multi-language support.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600">
              <span>Open Chat</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Career Search */}
          <Link
            to="/career/jobs"
            className="p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  Career Search
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Autonomous career matching and job listings discovery across Japan IT.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-indigo-600">
              <span>Search Jobs</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Interview Prep */}
          <Link
            to="/career/interview"
            className="p-4 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                  Interview Prep
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  AI mock technical interviews, answer scoring, and feedback.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-600">
              <span>Practice</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 4: General Web Agent (marked Coming Soon / Planned per PART 2) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between text-slate-400">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-mono">
                  Coming Soon
                </span>
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-700">General Web Agent</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Cloud-hosted autonomous browser agent is planned for a future release.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
              In Development
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: YOUR COMPUTERS (PART 2 & 3) */}
      <div className="space-y-3.5">
        <SectionHeader
          title="YOUR COMPUTERS"
          subtitle="Connected host machines running TRON Desktop Agent"
          actionText={devices.length > 0 ? 'Manage Devices' : undefined}
          onAction={() => navigate('/workspace/agent/devices')}
        />

        {devices.length === 0 ? (
          /* Small Elegant Empty-State Card (PART 2: DO NOT use a giant 500px card) */
          <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-2xs max-w-lg mx-auto text-center space-y-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Laptop className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">No computers connected</h3>
              <p className="text-xs text-slate-500">
                Connect TRON Desktop Agent to let TRON work with:
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600 font-medium">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100">Files</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100">Terminal</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100">Git</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100">Build tools</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100">Local browser</span>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsPairModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Connect Computer
              </button>
            </div>
          </div>
        ) : (
          /* Compact Device Cards Grid (PART 3) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                hostname={device.displayName || device.hostname || `Device #${device.id}`}
                os={device.os || 'Windows 11'}
                status={device.status}
                workspace={device.allowedWorkspace}
                lastSeen={device.lastSeen ? 'Recently' : 'Now'}
                onOpen={() => navigate('/workspace/agent')}
                onMore={() => navigate('/workspace/agent/devices')}
              />
            ))}
          </div>
        )}
      </div>

      {/* QUICK ACCESS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
        <Link
          to="/workspace/agent"
          className="p-4 rounded-2xl bg-white/95 border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Coding Agent</h4>
            <p className="text-[11px] text-slate-500">Autonomous code editing & runs</p>
          </div>
        </Link>

        <Link
          to="/workspace/agent/tasks"
          className="p-4 rounded-2xl bg-white/95 border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Active Tasks</h4>
            <p className="text-[11px] text-slate-500">Live executions & approval gates</p>
          </div>
        </Link>

        <Link
          to="/workspace/agent/history"
          className="p-4 rounded-2xl bg-white/95 border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Execution History</h4>
            <p className="text-[11px] text-slate-500">Completed task traces & diffs</p>
          </div>
        </Link>
      </div>

      {/* Modals */}
      <PairDeviceModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onDevicePaired={(dev) => {
          setDevices((prev) => [...prev, dev]);
          navigate('/workspace/agent/devices');
        }}
        onOpenSetupHelp={() => {
          setIsPairModalOpen(false);
          setIsSetupHelpOpen(true);
        }}
      />

      <LocalSetupHelpModal
        isOpen={isSetupHelpOpen}
        onClose={() => setIsSetupHelpOpen(false)}
        onOpenPairModal={() => {
          setIsSetupHelpOpen(false);
          setIsPairModalOpen(true);
        }}
      />
    </div>
  );
};
