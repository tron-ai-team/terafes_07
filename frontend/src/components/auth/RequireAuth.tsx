import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Lock, LogIn, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GlassCard } from '../common/GlassCard';
import { NeonButton } from '../common/NeonButton';
import { TronLogo } from '../common/TronLogo';
import { sanitizeReturnTo, storeAuthReturnTo } from '../../utils/safeReturnTo';

interface RequireAuthProps {
  children: React.ReactNode;
  /** Short feature name for copy, e.g. "AI Chat" */
  featureName?: string;
  featureNameJa?: string;
}

/**
 * Route guard for core authenticated features.
 * Distinguishes auth-loading vs guest (sign-in required) — never shows 404.
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  featureName = 'this feature',
  featureNameJa,
}) => {
  const { isAuthenticated, isLoadingAuth, uiLanguage } = useApp();
  const location = useLocation();
  const ja = uiLanguage === 'ja';

  if (isLoadingAuth) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden />
          <p className="text-xs font-medium">
            {ja ? 'セッションを確認しています…' : 'Checking your session…'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnPath = sanitizeReturnTo(
      `${location.pathname}${location.search || ''}`,
    );
    storeAuthReturnTo(returnPath);
    const signInHref = `/auth?mode=signin&returnTo=${encodeURIComponent(returnPath)}`;
    const signUpHref = `/auth?mode=signup&returnTo=${encodeURIComponent(returnPath)}`;
    const displayName = ja
      ? featureNameJa || featureName
      : featureName;

    return (
      <div className="flex-1 flex items-center justify-center py-10 px-4">
        <GlassCard className="max-w-md w-full p-8 text-center space-y-5">
          <div className="flex justify-center">
            <TronLogo size="lg" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" aria-hidden />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
              {ja ? 'ログインが必要です' : 'Sign in required'}
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              {ja
                ? `${displayName}を利用するにはログインしてください。`
                : `Please sign in to use ${displayName}.`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
            <Link to={signInHref} className="w-full sm:w-auto">
              <NeonButton className="w-full" icon={<LogIn className="w-4 h-4" />}>
                {ja ? 'ログイン' : 'Sign in'}
              </NeonButton>
            </Link>
            <Link to={signUpHref} className="w-full sm:w-auto">
              <NeonButton
                variant="secondary"
                className="w-full"
                icon={<UserPlus className="w-4 h-4" />}
              >
                {ja ? 'アカウント作成' : 'Create account'}
              </NeonButton>
            </Link>
          </div>
          <Link
            to="/"
            className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-700 pt-1"
          >
            {ja ? 'ホームに戻る' : 'Return to Home'}
          </Link>
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
};
