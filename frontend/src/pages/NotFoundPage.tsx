import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, MessageCircle, Mic, FileText, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { TronLogo } from '../components/common/TronLogo';
import { useApp } from '../context/AppContext';

/**
 * Branded 404 for genuinely unknown public paths.
 * Distinct from auth-required and feature-unavailable states.
 */
export const NotFoundPage: React.FC = () => {
  const { uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';

  const links = [
    { to: '/', label: ja ? 'ホーム' : 'Home', icon: <Compass className="w-4 h-4" /> },
    { to: '/chat', label: 'AI Chat', icon: <MessageCircle className="w-4 h-4" /> },
    { to: '/voice', label: 'AI Voice', icon: <Mic className="w-4 h-4" /> },
    {
      to: '/career/interview',
      label: ja ? '面接練習' : 'Interview Practice',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      to: '/career/cv-builder',
      label: ja ? '履歴書ビルダー' : 'AI CV Builder',
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#F8FCFF]">
      <GlassCard className="max-w-lg w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <TronLogo size="lg" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-mono font-bold text-blue-600 tracking-wider">404</p>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display tracking-tight">
            {ja ? 'お探しのページが見つかりません' : 'This page could not be found'}
          </h1>
          <p className="text-sm text-slate-500">
            {ja
              ? 'URLをご確認いただくか、下記の主要機能からお選びください。'
              : 'Check the URL, or continue with one of TRON AI’s core features.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[#E2EEF8] bg-white/80 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <span className="text-blue-500">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
        <Link to="/">
          <NeonButton className="w-full sm:w-auto">{ja ? 'ホームへ' : 'Go to Home'}</NeonButton>
        </Link>
      </GlassCard>
    </div>
  );
};
