import React, { useState } from 'react';
import {
  X,
  Terminal,
  Server,
  Laptop,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  FolderGit2,
  ExternalLink,
} from 'lucide-react';

interface LocalSetupHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPairModal?: () => void;
}

export const LocalSetupHelpModal: React.FC<LocalSetupHelpModalProps> = ({
  isOpen,
  onClose,
  onOpenPairModal,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Local Setup Help
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Running locally
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Quick guide for running TRON Core and Desktop Agent on your computer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-600">
          {/* Quick 3-Step Overview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>3-Step Local Execution Flow</span>
            </h4>
            <ol className="space-y-2.5 text-slate-700 list-decimal list-inside pl-1 font-medium">
              <li>
                <span className="font-bold text-slate-900">Start TRON Core</span> — The local Spring Boot backend orchestrator.
              </li>
              <li>
                <span className="font-bold text-slate-900">Start TRON Desktop Agent</span> — The JavaFX companion window on your PC.
              </li>
              <li>
                <span className="font-bold text-slate-900">Pair using the displayed code</span> — Enter the 6-digit pairing code in the Web Console.
              </li>
            </ol>
          </div>

          {/* Detailed Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
                  1
                </span>
                <h5 className="font-bold text-slate-900">Start TRON Core (Backend)</h5>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Port 8080</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Launch the core services from the project root using the provided batch script or Maven wrapper:
            </p>
            <div className="relative group">
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto">
                .\run.cmd
              </pre>
              <button
                onClick={() => copyToClipboard('.\\run.cmd', 'cmd1')}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Copy command"
              >
                {copiedCmd === 'cmd1' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Alternative: cd backend\backend-spring && .\mvnw.cmd spring-boot:run
            </p>
          </div>

          {/* Detailed Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
                  2
                </span>
                <h5 className="font-bold text-slate-900">Start TRON Desktop Agent</h5>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Requires Java 21</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Launch the companion JavaFX agent application in a new terminal window:
            </p>
            <div className="relative group">
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto">
                .\run-desktop.cmd
              </pre>
              <button
                onClick={() => copyToClipboard('.\\run-desktop.cmd', 'cmd2')}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Copy command"
              >
                {copiedCmd === 'cmd2' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Alternative: cd desktop-agent && ..\backend\backend-spring\mvnw.cmd javafx:run
            </p>
          </div>

          {/* Detailed Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px]">
                3
              </span>
              <h5 className="font-bold text-slate-900">Pair Using the Displayed Code</h5>
            </div>
            <p className="text-slate-500 leading-relaxed">
              The Desktop Agent window displays a unique 6-digit pairing code (for example: <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono">748-291</code>). Click the button below to submit the code:
            </p>
          </div>

          {/* Troubleshooting Checklist */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-slate-700">
            <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Troubleshooting Checklist</span>
            </h5>
            <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
              <li>
                <strong className="text-slate-800">Java Version:</strong> Ensure Java 21 JDK is installed and <code className="font-mono">JAVA_HOME</code> is configured.
              </li>
              <li>
                <strong className="text-slate-800">Core Connection:</strong> TRON Core must be running at <code className="font-mono">http://localhost:8080</code>.
              </li>
              <li>
                <strong className="text-slate-800">Code Expiration:</strong> Pairing codes remain valid for 10 minutes. If expired, restart the agent to get a fresh code.
              </li>
              <li>
                <strong className="text-slate-800">Workspace Directory:</strong> Ensure the allowed workspace directory exists on your computer (e.g. <code className="font-mono">C:\Dev</code>).
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>

          {onOpenPairModal && (
            <button
              onClick={() => {
                onClose();
                onOpenPairModal();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Open Pair Device</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
