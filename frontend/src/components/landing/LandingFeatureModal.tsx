import React, { useState } from 'react';
import { X, ArrowRight, Sparkles, MessageSquare, Mic, FileText, Briefcase, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureCardItem } from '../../types/landing';
import { useTranslation } from '../../hooks/useTranslation';

interface LandingFeatureModalProps {
  feature: FeatureCardItem | null;
  onClose: () => void;
}

export const LandingFeatureModal: React.FC<LandingFeatureModalProps> = ({ feature, onClose }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [testInput, setTestInput] = useState('');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!feature) return null;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    setIsLoading(true);
    setSimulatedResponse(null);

    setTimeout(() => {
      setIsLoading(false);
      if (feature.id === 'chat') {
        setSimulatedResponse(`[TRON AI Core]: Analyzed "${testInput}". Generated optimized asynchronous service layer with O(1) cache lookup.`);
      } else if (feature.id === 'voice') {
        setSimulatedResponse(`[TRON Voice Engine]: Audio prosody synthesized for "${testInput}". Speech recognition confidence: 99.2%.`);
      } else if (feature.id === 'interview') {
        setSimulatedResponse(`[TRON Interview AI]: "ご質問ありがとうございます。${testInput} に関する実務経験について具体的に教えてください。" (敬語評価: 100%)`);
      } else if (feature.id === 'coding') {
        setSimulatedResponse(`[Desktop Agent]: Scaffolding branch for "${testInput}". Build clean, 12 unit tests passing.`);
      } else if (feature.id === 'career') {
        setSimulatedResponse(`[Career Center]: Analyzed tech profile "${testInput}". Matched 6 top engineering openings in Tokyo.`);
      }
    }, 700);
  };

  const handleLaunch = () => {
    onClose();
    navigate(feature.routePath);
  };

  const getIcon = () => {
    switch (feature.id) {
      case 'chat': return <MessageSquare className="w-6 h-6 text-white" />;
      case 'voice': return <Mic className="w-6 h-6 text-white" />;
      case 'interview': return <FileText className="w-6 h-6 text-white" />;
      case 'coding': return <Terminal className="w-6 h-6 text-white" />;
      case 'career': return <Briefcase className="w-6 h-6 text-white" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-cyan-200/70 shadow-[0_25px_70px_rgba(0,102,255,0.22)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-blue-50/80 via-cyan-50/40 to-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white"
              style={{ backgroundColor: feature.accentColor }}
            >
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  {feature.title}
                </h3>
                {feature.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100/80 text-blue-700">
                    {feature.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{feature.shortDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-left">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {feature.fullDesc}
          </p>

          {/* Key Capabilities List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verified Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {feature.keyFeatures.map((kf, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span>{kf}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Simulation Sandbox */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/60 to-cyan-50/30 border border-cyan-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>Interactive Trial Box</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">LIVE PREVIEW</span>
            </div>

            <form onSubmit={handleSimulate} className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder={
                  feature.id === 'coding' ? 'e.g. Scaffold authentication service...' :
                  feature.id === 'voice' ? 'e.g. Practice natural Japanese greetings...' :
                  feature.id === 'interview' ? 'e.g. Tell me about a challenging project...' :
                  feature.id === 'career' ? 'e.g. Find Tokyo Backend Engineer jobs...' :
                  'e.g. Explain binary search tree balancing...'
                }
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
              <button
                type="submit"
                disabled={isLoading || !testInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0"
              >
                {isLoading ? t.common.loading : 'Test Run'}
              </button>
            </form>

            {simulatedResponse && (
              <div className="p-3 rounded-xl bg-white border border-cyan-200 text-xs text-slate-800 font-mono animate-fadeIn">
                {simulatedResponse}
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Target Module: <code className="text-blue-600 font-mono">{feature.routePath}</code>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all"
              >
                {t.common.close}
              </button>
              <button
                onClick={handleLaunch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
              >
                <span>{t.features.launchInApp}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
