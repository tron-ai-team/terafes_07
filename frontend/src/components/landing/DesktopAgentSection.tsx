import React, { useState } from 'react';
import { Terminal, CheckCircle2, AlertCircle, Laptop, ArrowRight, ShieldCheck, Play, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export const DesktopAgentSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'terminal' | 'diff' | 'security'>('terminal');

  return (
    <section id="desktop-agent" className="py-20 sm:py-28 relative overflow-hidden bg-white" aria-label="TRON Desktop Coding Agent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-bold text-teal-700 uppercase tracking-wider">
              <Laptop className="w-3.5 h-3.5 text-teal-600" />
              <span>{t.desktopAgent.badge}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight leading-tight">
              {t.desktopAgent.title}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {t.desktopAgent.desc}
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700">{t.desktopAgent.feature1}</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700">{t.desktopAgent.feature2}</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700">{t.desktopAgent.feature3}</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700">{t.desktopAgent.feature4}</span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{t.desktopAgent.note}</span>
            </div>

            {/* Launch Button */}
            <div>
              <button
                onClick={() => navigate('/workspace/agent')}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-500/20 transition-all flex items-center gap-2"
              >
                <span>{t.desktopAgent.openWorkspaceAgent}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Preview Column: High-tech Terminal & Diff Simulator */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl bg-slate-950 border border-slate-800 shadow-[0_25px_60px_rgba(0,102,255,0.15)] overflow-hidden text-slate-300 font-mono text-xs">
              
              {/* Window Title Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-400 font-sans text-xs font-semibold">
                    {t.desktopAgent.windowTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('terminal')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                      activeTab === 'terminal' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.desktopAgent.terminalTab}
                  </button>
                  <button
                    onClick={() => setActiveTab('diff')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                      activeTab === 'diff' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.desktopAgent.diffTab}
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                      activeTab === 'security' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.desktopAgent.securityTab}
                  </button>
                </div>
              </div>

              {/* Tab Content Display */}
              <div className="p-6 h-[340px] overflow-y-auto text-left space-y-2 select-text">
                {activeTab === 'terminal' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <p className="text-teal-400">$ tron-agent run --task "Scaffold payment authentication"</p>
                    <p className="text-slate-400">[INFO] Pairing verified with token 4f9a...88b</p>
                    <p className="text-slate-400">[INFO] Workdir: C:\Users\workspace\projects\fintech-core</p>
                    <p className="text-blue-400">[ANALYSIS] Synthesizing JWT validation & refresh-token interceptors...</p>
                    <p className="text-emerald-400">[MODIFIED] src/auth/jwtInterceptor.ts (+42 lines, -3 lines)</p>
                    <p className="text-emerald-400">[MODIFIED] src/auth/tokenStorage.ts (+28 lines)</p>
                    <p className="text-teal-400">$ npm run test:auth</p>
                    <p className="text-slate-300">PASS src/auth/__tests__/jwtInterceptor.test.ts (14 passed, 0 failed)</p>
                    <p className="text-emerald-400 font-bold">✔ Build succeeded in 2.38s (0 warnings)</p>
                    <p className="text-slate-500">// Waiting for developer approval to commit changes...</p>
                  </div>
                )}

                {activeTab === 'diff' && (
                  <div className="space-y-1 animate-fadeIn text-[11px]">
                    <p className="text-slate-400">--- a/src/auth/tokenStorage.ts</p>
                    <p className="text-slate-400">+++ b/src/auth/tokenStorage.ts</p>
                    <p className="text-blue-400">@@ -18,6 +18,14 @@ export class TokenStorage &#123;</p>
                    <p className="text-rose-400">-  private accessToken: string | null = null;</p>
                    <p className="text-emerald-400">+  private accessToken: string | null = null;</p>
                    <p className="text-emerald-400">+  private refreshSingleFlightPromise: Promise&lt;TokenResult&gt; | null = null;</p>
                    <p className="text-slate-400">   public getAccessToken(): string | null &#123;</p>
                    <p className="text-slate-400">     return this.accessToken;</p>
                    <p className="text-slate-400">   &#125;</p>
                    <p className="text-emerald-400">+  public async refreshSafe(): Promise&lt;string&gt; &#123;</p>
                    <p className="text-emerald-400">+    if (!this.refreshSingleFlightPromise) &#123;</p>
                    <p className="text-emerald-400">+      this.refreshSingleFlightPromise = this.requestNewToken();</p>
                    <p className="text-emerald-400">+    &#125;</p>
                    <p className="text-emerald-400">+    return (await this.refreshSingleFlightPromise).token;</p>
                    <p className="text-emerald-400">+  &#125;</p>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Security Sandbox: STRICT DEVELOPER SUPERVISION</span>
                    </div>
                    <p className="text-slate-400">
                      - Destructive shell commands (rm -rf, format, drop table) are hard-blocked by agent sandbox.
                    </p>
                    <p className="text-slate-400">
                      - Network sockets are restricted to local loopback (127.0.0.1) and configured gateway domains.
                    </p>
                    <p className="text-slate-400">
                      - Environment variables containing API secrets are sanitized before diagnostic logs.
                    </p>
                    <p className="text-teal-400 font-bold">
                      ✔ Zero unauthorized telemetry. Real source code never leaves your workstation.
                    </p>
                  </div>
                )}
              </div>

              {/* Terminal Bottom Status Bar */}
              <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>DESKTOP BRIDGE: READY</span>
                </span>
                <span className="text-teal-300 font-mono">localhost:8080</span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
