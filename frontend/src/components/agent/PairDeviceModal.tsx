import React, { useState, useEffect } from 'react';
import {
  X,
  Laptop,
  KeyRound,
  Loader2,
  CheckCircle2,
  FolderCode,
  Download,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { desktopAgentClient } from '../../services/desktopAgentClient';
import { DesktopAgentDevice } from '../../types/desktopAgent';

interface PairDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicePaired: (device: DesktopAgentDevice) => void;
  onOpenSetupHelp?: () => void;
}

export const PairDeviceModal: React.FC<PairDeviceModalProps> = ({
  isOpen,
  onClose,
  onDevicePaired,
  onOpenSetupHelp,
}) => {
  const [view, setView] = useState<'normal' | 'code'>('normal');
  const [part1, setPart1] = useState('');
  const [part2, setPart2] = useState('');
  const [allowedWorkspace, setAllowedWorkspace] = useState('C:\\Dev');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{
    downloadAvailable: boolean;
    downloadUrl: string | null;
  }>({ downloadAvailable: false, downloadUrl: null });

  useEffect(() => {
    if (isOpen) {
      setView('normal');
      setError(null);
      setSuccess(false);
      desktopAgentClient
        .getDownloadInfo()
        .then((info) => setDownloadInfo(info))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullCode = `${part1.trim()}-${part2.trim()}`;
    if (part1.trim().length !== 3 || part2.trim().length !== 3) {
      setError('Please enter the complete 6-digit pairing code (e.g. 748-291).');
      return;
    }

    if (!allowedWorkspace.trim()) {
      setError('Allowed workspace directory is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paired = await desktopAgentClient.pairDevice(
        fullCode,
        allowedWorkspace.trim(),
        displayName.trim() || undefined
      );
      setSuccess(true);
      setTimeout(() => {
        onDevicePaired(paired);
        onClose();
      }, 900);
    } catch (err: any) {
      const msg = err?.message || 'Failed to pair device. Please check the code in your Desktop Agent.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (downloadInfo.downloadAvailable && downloadInfo.downloadUrl) {
      window.location.href = downloadInfo.downloadUrl;
    } else if (onOpenSetupHelp) {
      onOpenSetupHelp();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#008CFF] to-[#0066FF] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-display">
                Connect a computer to TRON
              </h3>
              <p className="text-xs text-slate-500">Desktop Agent Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {view === 'normal' ? (
            /* PART 5: Clean Primary Flow */
            <div className="space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Install TRON Desktop Agent to securely let TRON work on your computer.
              </p>

              {/* 4 Clean Steps */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span className="text-slate-700 font-medium">Install Desktop Agent</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span className="text-slate-700 font-medium">Open TRON Desktop Agent</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span className="text-slate-700 font-medium">Click Continue with TRON</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span className="text-slate-700 font-medium">Authorize this computer in your browser</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download for Windows</span>
                </button>

                {onOpenSetupHelp && (
                  <button
                    type="button"
                    onClick={onOpenSetupHelp}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Local Setup Help</span>
                  </button>
                )}
              </div>

              {/* Secondary Fallback */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setView('code')}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Pair using a code</span>
                </button>
              </div>
            </div>
          ) : success ? (
            /* Paired Success */
            <div className="py-7 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="font-bold text-base text-slate-900">Desktop Agent Paired!</h4>
              <p className="text-xs text-slate-500">
                Your computer is now securely paired with your TRON account.
              </p>
            </div>
          ) : (
            /* Pair using code Fallback */
            <form onSubmit={handlePair} className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">6-Digit Pairing Code</h4>
                <p className="text-[11px] text-slate-500">
                  Enter the code displayed in your Desktop Agent window.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 py-1">
                <input
                  type="text"
                  maxLength={3}
                  value={part1}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPart1(val);
                    if (val.length === 3) {
                      document.getElementById('pair-part2')?.focus();
                    }
                  }}
                  placeholder="748"
                  className="w-24 text-center py-2.5 text-xl font-mono font-bold tracking-widest text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                  autoFocus
                />
                <span className="text-xl font-bold text-slate-400">-</span>
                <input
                  id="pair-part2"
                  type="text"
                  maxLength={3}
                  value={part2}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPart2(val);
                  }}
                  placeholder="291"
                  className="w-24 text-center py-2.5 text-xl font-mono font-bold tracking-widest text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Allowed Workspace Sandbox</label>
                <div className="relative">
                  <FolderCode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={allowedWorkspace}
                    onChange={(e) => setAllowedWorkspace(e.target.value)}
                    placeholder="C:\Dev"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setView('normal')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmitting ? 'Pairing...' : 'Pair Computer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
