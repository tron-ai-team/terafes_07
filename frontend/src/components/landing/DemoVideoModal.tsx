import React, { useState } from 'react';
import { X, Play, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Cpu, Mic, Terminal, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoVideoModal: React.FC<DemoVideoModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'interview' | 'agent' | 'hybrid'>('overview');

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-cyan-200/60 shadow-[0_25px_70px_rgba(0,102,255,0.2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/80 via-cyan-50/50 to-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 border border-blue-200/50">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 id="demo-modal-title" className="text-lg font-bold text-slate-900 font-heading">
                TRON AI — Interactive Platform Walkthrough
              </h3>
              <p className="text-xs text-slate-500">{t.hero.demoOverview}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Simulation Canvas / Interactive Player */}
        <div className="p-6">
          <div className="relative aspect-video w-full rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden border border-cyan-500/30 flex flex-col justify-between p-6 text-white shadow-inner">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            
            {/* Top HUD */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>TRON AI ENGINE // LIVE RUNTIME</span>
              </div>
              <div className="text-xs font-mono text-cyan-300">
                qwen3:8b [LOCAL] + CLOUD_ROUTER [READY]
              </div>
            </div>

            {/* Central Interactive Simulation */}
            <div className="relative z-10 my-auto text-center space-y-4 max-w-xl mx-auto">
              {activeTab === 'overview' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold font-heading text-white">Full-Stack AI Operating Platform</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    TRON AI unifies multimodal conversational intelligence, real-time Japanese voice mock interviews, autonomous desktop coding execution, and career advancement into one seamless environment.
                  </p>
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                    <Mic className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold font-heading text-white">Real-Time Japanese Speech & Keigo</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Evaluates Japanese spoken fluency, honorific grammar (敬語), and STAR-formatted logic with live scorecards tailored for Tokyo technology enterprises.
                  </p>
                </div>
              )}

              {activeTab === 'agent' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                    <Terminal className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold font-heading text-white">Supervised Desktop Coding Agent</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Executes build commands, performs automated test suites, and generates side-by-side git diffs with complete developer review and explicit command approvals.
                  </p>
                </div>
              )}

              {activeTab === 'hybrid' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                    <Cpu className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold font-heading text-white">Dynamic Semantic Router</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Intelligently dispatches prompts between local on-device inference (qwen3:8b) for complete privacy and high-capacity cloud models (Groq / OpenRouter) for complex code generation.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Simulation Track Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1.5">
                {(['overview', 'interview', 'agent', 'hybrid'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      activeTab === tab
                        ? 'bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-400/25'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>UNIFIED ARCHITECTURE VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {t.features.modalSubtitle}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
            >
              {t.common.close}
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/workspace');
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <span>{t.common.openWorkspace}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
