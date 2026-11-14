import React from 'react';
import { Link } from 'react-router-dom';
import { Construction, MessageCircle, Mic, FileText, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { TronLogo } from '../components/common/TronLogo';
import { useApp } from '../context/AppContext';

interface FeatureUnavailablePageProps {
  title?: string;
  titleJa?: string;
  description?: string;
  descriptionJa?: string;
}

/**
 * Friendly page for unfinished/hidden product areas that still have routes preserved.
 * Does not delete backend code — only stops implying the feature is publicly ready.
 */
export const FeatureUnavailablePage: React.FC<FeatureUnavailablePageProps> = ({
  title,
  titleJa,
  description,
  descriptionJa,
}) => {
  const { uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';

  const heading = ja
    ? titleJa || 'この機能は現在公開されていません'
    : title || 'This feature is not published yet';
  const body = ja
    ? descriptionJa ||
      'TRON AIのコア機能（AIチャット、AI音声、面接練習、履歴書ビルダー）をご利用ください。'
    : description ||
      'Please use TRON AI’s core features: AI Chat, AI Voice, Interview Practice, and AI CV Builder.';

  const links = [
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
    <div className="flex-1 flex items-center justify-center py-10 px-4">
      <GlassCard className="max-w-md w-full p-8 text-center space-y-5">
        <div className="flex justify-center">
          <TronLogo size="lg" />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto">
          <Construction className="w-5 h-5" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
            {heading}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
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
          <NeonButton variant="secondary">{ja ? 'ホームへ' : 'Back to Home'}</NeonButton>
        </Link>
      </GlassCard>
    </div>
  );
};
