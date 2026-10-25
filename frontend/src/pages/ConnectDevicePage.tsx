import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { TronLogo } from '../components/common/TronLogo';
import { NeonButton } from '../components/common/NeonButton';
import {
  Laptop,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderCode,
  ArrowRight,
  Loader2,
  LogIn,
} from 'lucide-react';

export const ConnectDevicePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { requestId: routeRequestId } = useParams<{ requestId?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, addToast } = useApp();

  const requestId = routeRequestId || searchParams.get('request') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestData, setRequestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [customWorkspace, setCustomWorkspace] = useState('');
  const [customDisplayName, setCustomDisplayName] = useState('');

  // Save current destination for login return path
  const handleSignInRedirect = () => {
    const fullPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('tron_auth_return_url', fullPath);
    navigate(`/auth?mode=signin&redirect=${encodeURIComponent(fullPath)}`);
  };

  // Load public request details (contract: auth not required to read public details)
  useEffect(() => {
    if (!requestId) {
      setError('Missing device authorization request ID in URL.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchRequest() {
      setLoading(true);
      setError(null);
      try {
        const data = await desktopAgentClient.getLinkRequest(requestId);
        if (isMounted) {
          setRequestData(data);
          setCustomWorkspace(data.requestedWorkspace || 'C:\\Dev');
          setCustomDisplayName(data.displayName || data.hostname || 'My Computer');
          if (data.status === 'AUTHORIZED' || data.status === 'PAIRED') {
            setAuthorized(true);
          } else if (data.status === 'EXPIRED' || data.expired) {
            setError('This connection request has expired.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const msg: string = err.message || '';
          if (msg.includes('410') || msg.toLowerCase().includes('expired')) {
            setError('This connection request has expired.');
          } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
            setError('This connection request was not found or has already been used.');
          } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
            setError('TRON Core is offline.');
          } else {
            setError('Unable to retrieve device link request.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchRequest();

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const handleAuthorize = async () => {
    if (!requestId) return;
    setSubmitting(true);
    setError(null);

    try {
      await desktopAgentClient.authorizeLinkRequest(
        requestId,
        customWorkspace.trim() || undefined,
        customDisplayName.trim() || undefined
      );
      setAuthorized(true);
      addToast('Computer authorized successfully! Desktop Agent is now connected.', 'success');
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.includes('410') || msg.toLowerCase().includes('expired')) {
        setError('This connection request has expired.');
      } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        setError('TRON Core is offline.');
      } else {
        setError(msg || 'Authorization failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const computerName = requestData?.hostname || requestData?.displayName || 'My Computer';
  const osName = requestData?.os || requestData?.osName || 'Windows 11';
  const agentVersion = requestData?.agentVersion || '0.1.0';

  if (isLoadingAuth || (loading && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FCFF]">
        <div className="text-center space-y-3 animate-in fade-in">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading connection request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#F8FCFF] overflow-hidden select-none">
      {/* Background Ambience */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center select-none opacity-85"
        style={{ backgroundImage: `url('/assets/tron-bg.jpg')` }}
      />
      <div className="fixed inset-0 sci-fi-perspective-grid opacity-35 pointer-events-none" />
      <div className="fixed w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[480px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-8 shadow-2xl shadow-blue-500/10 animate-in fade-in duration-300">
        {/* Header Emblem */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#008CFF] to-[#00DFFF] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">
              Connect this computer to TRON
            </h1>
            <p className="text-xs text-slate-500">
              Desktop Agent Security Authorization
            </p>
          </div>
        </div>

        {/* Not Signed In State */}
        {!isAuthenticated ? (
          <div className="py-7 text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">Sign in to continue</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Please sign in to your TRON account to review and authorize connecting this computer.
              </p>
            </div>

            <div className="pt-2">
              <NeonButton
                size="md"
                onClick={handleSignInRedirect}
                className="w-full flex items-center justify-center gap-2"
              >
                <span>Sign In to Continue</span>
                <ArrowRight className="w-4 h-4" />
              </NeonButton>
            </div>
          </div>
        ) : authorized ? (
          /* Authorized Success State */
          <div className="py-7 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Computer connected</h2>
              <p className="text-xs text-slate-600 leading-relaxed font-mono">
                {computerName} is ready.
              </p>
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              This computer has been connected securely. You can now launch tasks in TRON Workspace or close this tab.
            </p>
            <div className="pt-3">
              <NeonButton
                size="md"
                onClick={() => navigate('/workspace/agent')}
                className="w-full flex items-center justify-center gap-2"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </NeonButton>
            </div>
          </div>
        ) : (
          /* Security Authorization Form */
          <div className="py-5 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Authorization Notice</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Computer Details Grid */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">Computer:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {computerName}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">Operating System:</span>
                <span className="font-semibold text-slate-800">
                  {osName}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium">Agent Version:</span>
                <span className="font-semibold text-blue-600 font-mono">
                  {agentVersion}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Requested Workspace:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {requestData?.requestedWorkspace || customWorkspace || 'C:\\Dev'}
                </span>
              </div>
            </div>

            {/* Workspace Directory Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Allowed Workspace
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none">
                  <FolderCode className="w-4 h-4 text-blue-500" />
                </div>
                <input
                  type="text"
                  value={customWorkspace}
                  onChange={(e) => setCustomWorkspace(e.target.value)}
                  placeholder="C:\Dev"
                  className="w-full pl-10 pr-3 py-2 font-mono text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">Security Note</span>
                <span className="text-[11px] text-slate-500 leading-relaxed block">
                  TRON will only execute within the authorized workspace. Sensitive actions may require confirmation.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/workspace/agent/devices')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <NeonButton
                size="md"
                onClick={handleAuthorize}
                isLoading={submitting}
                className="flex items-center gap-2"
              >
                <span>Authorize Computer</span>
                <ArrowRight className="w-4 h-4" />
              </NeonButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
