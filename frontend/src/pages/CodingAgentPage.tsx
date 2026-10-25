import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DeviceSelector } from '../components/agent/DeviceSelector';
import { PairDeviceModal } from '../components/agent/PairDeviceModal';
import { LocalSetupHelpModal } from '../components/agent/LocalSetupHelpModal';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import { useApp } from '../context/AppContext';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { DesktopAgentDevice } from '../types/desktopAgent';
import { AiProfile } from '../types/aiProfile';
import { mapAiModeToBackendProfile, ULTRA_CREDIT_COSTS } from '../config/aiModes';
import { resolveLanguage } from '../utils/languageResolver';
import { StatusBadge } from '../components/common/StatusDesignSystem';
import {
  Terminal,
  Play,
  Loader2,
  FolderCode,
  Sparkles,
  ShieldCheck,
  Laptop,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  FileCode,
  Globe,
  Activity,
  Send,
  Plus,
} from 'lucide-react';

export const CodingAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    selectedAiMode,
    setSelectedAiMode,
    ultraCredits,
    consumeUltraCredit,
    setUltraLimitModalOpen,
    aiProfiles,
    selectedLanguage,
    addToast,
  } = useApp();

  const langDef = resolveLanguage(selectedLanguage);
  const [devices, setDevices] = useState<DesktopAgentDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [workspace, setWorkspace] = useState<string>('C:\\Dev');
  const [goal, setGoal] = useState<string>('');
  const [selectedProfile, setSelectedProfileState] = useState<AiProfile>(selectedAiMode);

  // Keep in sync with global AI mode
  useEffect(() => {
    setSelectedProfileState(selectedAiMode);
  }, [selectedAiMode]);

  const handleProfileChange = (profile: AiProfile) => {
    setSelectedProfileState(profile);
    const upper = profile.toUpperCase();
    if (['AUTO', 'FAST', 'SMART', 'ULTRA'].includes(upper)) {
      setSelectedAiMode(upper as any);
    }
  };

  // Secondary technical tabs: Conversation is primary per PART 4
  const [activeTab, setActiveTab] = useState<'conversation' | 'terminal' | 'files' | 'browser' | 'trace'>('conversation');

  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [isPairModalOpen, setIsPairModalOpen] = useState<boolean>(false);
  const [isSetupHelpOpen, setIsSetupHelpOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load devices and handle device preselection per PART 11
  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const data = await desktopAgentClient.getDevices();
      setDevices(data);

      const online = data.filter((d) => d.status === 'ONLINE');
      const paramDevice = searchParams.get('device');

      if (paramDevice && online.some((d) => String(d.id) === paramDevice)) {
        // User directly requested this device from URL and it's online
        const target = online.find((d) => String(d.id) === paramDevice);
        setSelectedDeviceId(paramDevice);
        if (target?.allowedWorkspace) setWorkspace(target.allowedWorkspace);
      } else if (online.length === 1) {
        // PART 11: if one ONLINE device -> preselect
        setSelectedDeviceId(String(online[0].id));
        if (online[0].allowedWorkspace) {
          setWorkspace(online[0].allowedWorkspace);
        }
      } else if (online.length > 1) {
        // PART 11: if multiple -> user selects (do NOT auto-select unless already chose an online device)
        if (selectedDeviceId && online.some((d) => String(d.id) === selectedDeviceId)) {
          // keep selected
        } else {
          setSelectedDeviceId('');
        }
      } else {
        // PART 11: if zero -> do not select any device
        setSelectedDeviceId('');
      }
    } catch (err: any) {
      console.warn('Failed to load devices from backend:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [searchParams]);

  const handleDeviceSelected = (deviceId: string) => {
    const d = devices.find((dev) => String(dev.id) === String(deviceId));
    if (d && d.status !== 'ONLINE') {
      addToast('Cannot select an offline device. Please ensure the agent is connected.', 'warning');
      return;
    }
    setSelectedDeviceId(deviceId);
    if (d?.allowedWorkspace) {
      setWorkspace(d.allowedWorkspace);
    }
  };

  const handleRunAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!selectedDeviceId) {
      setErrorMessage('Please select an online Desktop Agent computer.');
      return;
    }
    if (!workspace.trim()) {
      setErrorMessage('Workspace path is required.');
      return;
    }
    if (!goal.trim()) {
      setErrorMessage('Please enter a goal or instructions for the agent.');
      return;
    }

    // PART 4: Disclose & verify required Ultra credits before starting (agent = 2 credits)
    const agentUltraCost = ULTRA_CREDIT_COSTS.codingAgent;
    if (selectedProfile === 'ULTRA' || selectedAiMode === 'ULTRA') {
      if (ultraCredits.remaining < agentUltraCost) {
        setUltraLimitModalOpen(true);
        setErrorMessage('Your Ultra credits are finished for today. Please continue with Smart mode.');
        return;
      }
      // Optimistic local mirror only — Spring deducts on successful Ultra inference.
      consumeUltraCredit(agentUltraCost);
      addToast(`Ultra agent tasks cost ${agentUltraCost} credits (backend-enforced).`, 'info');
    }

    setIsSubmitting(true);
    try {
      const task = await desktopAgentClient.createTask({
        deviceId: selectedDeviceId,
        goal: goal.trim(),
        workspace: workspace.trim(),
        aiProfile: mapAiModeToBackendProfile(selectedProfile || selectedAiMode),
      });

      navigate(`/workspace/agent/tasks/${task.id}`);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to submit task to TRON Desktop Agent backend. Please ensure the backend is running.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onlineDevices = devices.filter((d) => d.status === 'ONLINE');
  const activeDevice = devices.find((d) => String(d.id) === selectedDeviceId);

  const sampleGoals = [
    'Inspect this workspace and run git status.',
    'Run maven tests and diagnose any failure.',
    'Inspect pom.xml and check dependency versions.',
    'Check local repository branch and recent commit history.',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-in fade-in duration-300">
      {/* Header (PART 4): Coding Agent | Device: H25304028 ● Online | Workspace: C:\... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#008CFF] to-[#00DFFF] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
                Coding Agent
              </h1>
              {activeDevice ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">•</span>
                  <span className="font-mono font-bold text-slate-800">
                    {activeDevice.displayName || activeDevice.hostname}
                  </span>
                  <StatusBadge status={activeDevice.status} size="sm" />
                </div>
              ) : (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  No device selected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Workspace: <span className="text-slate-800 font-bold">{workspace || 'C:\\Dev'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPairModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-600 shadow-2xs transition-all"
          >
            <Laptop className="w-3.5 h-3.5 text-blue-500" />
            <span>Connect Computer</span>
          </button>
        </div>
      </div>

      {/* ZERO ONLINE DEVICES CTA (PART 11) */}
      {!isLoadingDevices && onlineDevices.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-md shadow-blue-500/5 text-center max-w-xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Laptop className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Connect a computer to TRON
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              To execute terminal commands, edit local files, and run browser tasks, open TRON Desktop Agent on your computer.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-slate-600 font-medium">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100">Files</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100">Terminal</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100">Git</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100">Build tools</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100">Local browser</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsPairModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              Connect This Computer
            </button>
            <button
              type="button"
              onClick={() => setIsSetupHelpOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              Local Setup Help
            </button>
          </div>
        </div>
      ) : (
        /* TWO-COLUMN CURSOR/CODEX LAYOUT (PART 4) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT / MAIN: Conversation / Task Timeline (65% width) */}
          <div className="lg:col-span-8 flex flex-col rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-sm overflow-hidden min-h-[580px]">
            {/* Technical Tabs: Conversation is PRIMARY per PART 4 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('conversation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'conversation'
                      ? 'bg-white text-blue-600 shadow-2xs border border-blue-100'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Conversation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('terminal')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'terminal'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'files'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('browser')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'browser'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Browser</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('trace')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'trace'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Trace</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400">
                Agent v0.1.0
              </span>
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {activeTab === 'conversation' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/70 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-900">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>TRON Autonomous Engineering Agent</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Describe what you want to achieve on your connected machine. TRON will inspect your workspace, plan actions, execute terminal commands, modify files, and run tests.
                    </p>
                  </div>

                  {/* Sample Prompts */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Suggested Goals
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sampleGoals.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGoal(sample)}
                          className="p-3 text-left rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/70 hover:border-blue-200 text-xs text-slate-700 transition-all font-mono"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'terminal' && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 min-h-[300px]">
                  <p className="text-slate-500"># Terminal output will stream here during task execution...</p>
                  <p className="text-emerald-400">$ echo "TRON Agent Ready on {activeDevice?.displayName || 'Host'}"</p>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <FileCode className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No file changes recorded yet. Start a task to track file diffs.</p>
                </div>
              )}

              {activeTab === 'browser' && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <Globe className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No active browser session. Agent will start managed Playwright browser when needed.</p>
                </div>
              )}

              {activeTab === 'trace' && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <Activity className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Execution trace steps will appear once task is running.</p>
                </div>
              )}
            </div>

            {/* Persistent Composer Bottom (PART 4) */}
            <div className="p-4 border-t border-slate-100 bg-white/80 space-y-2.5">
              {errorMessage && (
                <p className="text-xs text-rose-500 font-medium px-1">{errorMessage}</p>
              )}

              <div className="relative rounded-2xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-slate-50/50 transition-all">
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleRunAgent();
                    }
                  }}
                  rows={3}
                  placeholder="Describe your coding task (e.g. Inspect workspace, fix failing tests, run git diff)..."
                  className="w-full p-3.5 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100/80">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Press Ctrl+Enter to launch
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRunAgent()}
                    disabled={isSubmitting || !goal.trim() || !selectedDeviceId}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:hover:brightness-100"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmitting ? 'Launching...' : 'Run Agent'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT / SECONDARY: Device + Workspace + Execution Context (35% width) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Device & Workspace Card */}
            <div className="p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Execution Host
                </h3>
                <span className="text-[11px] font-semibold text-blue-600">
                  {onlineDevices.length} Online
                </span>
              </div>

              {/* Device Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Target Machine
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceSelected(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>
                    Select an online computer...
                  </option>
                  {devices.map((d) => (
                    <option
                      key={d.id}
                      value={d.id}
                      disabled={d.status !== 'ONLINE'}
                    >
                      {d.displayName || d.hostname} ({d.os}) — {d.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Workspace Directory Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Allowed Workspace
                </label>
                <div className="relative">
                  <FolderCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="C:\Dev"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* AI Profile Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  AI Model Profile
                </label>
                <AiProfileSelector
                  selectedProfile={selectedProfile}
                  onChange={handleProfileChange}
                  availableProfiles={aiProfiles}
                  placement="bottom"
                />

                {(selectedProfile === 'ULTRA' || selectedAiMode === 'ULTRA') && (
                  <div className="mt-2 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-center justify-between">
                    <span className="font-semibold">Requires 1 Ultra credit</span>
                    <span className="font-mono text-purple-700">
                      {ultraCredits.remaining}/{ultraCredits.total} remaining
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Guarantee Card */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Sandbox Security Policy</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Actions are strictly confined to the authorized workspace. Dangerous actions (destructive commands, git push, deletes) require explicit local approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PairDeviceModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onDevicePaired={(dev) => {
          setDevices((prev) => [...prev, dev]);
          setSelectedDeviceId(String(dev.id));
          if (dev.allowedWorkspace) setWorkspace(dev.allowedWorkspace);
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
