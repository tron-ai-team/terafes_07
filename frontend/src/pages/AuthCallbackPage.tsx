import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authApi, refreshSessionSingleFlight, setAccessToken as setHttpAccessToken } from '../services/httpClient';
import { CORE_API_URL } from '../config/api';
import { TronLogo } from '../components/common/TronLogo';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, RotateCw } from 'lucide-react';
import { NeonButton } from '../components/common/NeonButton';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession, addToast } = useApp();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const processedRef = useRef(false);

  useEffect(() => {
    // Requirement 8: React Strict Mode idempotency guard
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleCallback() {
      const statusParam = searchParams.get('status');
      const messageParam = searchParams.get('message');
      const errorParam = searchParams.get('error');

      // Check backend error parameters from redirect
      if (statusParam === 'error' || errorParam || messageParam) {
        setStatus('error');
        const rawMsg = messageParam || errorParam || 'Authentication failed. Please try again.';
        setErrorMessage(decodeURIComponent(rawMsg));
        return;
      }

      if (statusParam === 'success') {
        try {
          // 1. Authoritative Single-Flight Refresh (cookies included)
          const authData = await refreshSessionSingleFlight();

          if (!authData?.accessToken) {
            throw new Error('No access token received from authentication session refresh.');
          }

          // 2. Store returned access token in HTTP client
          setHttpAccessToken(authData.accessToken);

          // 3. GET /api/v1/auth/me to fetch authenticated profile
          let meUser = authData.user;
          try {
            meUser = await authApi.getMe();
          } catch {
            // fallback to authData.user if /me temporarily fails
          }

          // 4. Update AppContext / current user
          await setAuthSession(authData.accessToken, meUser);

          setStatus('success');
          addToast(`Welcome back, ${meUser.displayName || meUser.email}!`, 'success');

          // 5. Check if there is an intended return route (e.g. from /connect-device)
          const returnUrl = sessionStorage.getItem('tron_auth_return_url');
          setTimeout(() => {
            if (returnUrl) {
              sessionStorage.removeItem('tron_auth_return_url');
              navigate(returnUrl, { replace: true });
            } else {
              navigate('/chat', { replace: true });
            }
          }, 500);
        } catch (err: any) {
          setStatus('error');
          const safeMsg =
            err?.detail ||
            err?.message ||
            'Unable to establish secure session after Google OAuth sign in.';
          setErrorMessage(safeMsg);
        }
      } else {
        setStatus('error');
        setErrorMessage('Invalid authentication callback response parameters.');
      }
    }

    void handleCallback();
  }, [searchParams, setAuthSession, navigate, addToast]);

  const handleTryAgain = () => {
    window.location.href = `${CORE_API_URL}/oauth2/authorization/google`;
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#F8FCFF] overflow-hidden select-none">
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center select-none"
        style={{ backgroundImage: `url('/assets/tron-bg.jpg')` }}
      />
      <div className="fixed inset-0 sci-fi-perspective-grid opacity-35 pointer-events-none" />
      <div className="fixed w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-8 shadow-2xl shadow-blue-500/10 text-center animate-in fade-in duration-300">
        <div className="flex justify-center mb-4">
          <TronLogo size="hero" />
        </div>

        <div className="flex items-center justify-center gap-1.5 font-display text-2xl font-black tracking-tight text-slate-900 mb-2">
          <span>TRON</span>
          <span className="text-[#008CFF]">AI</span>
        </div>

        {status === 'loading' && (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Signing you in...</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Verifying your Google credentials and establishing a secure session.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Welcome back</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Session established securely. Entering TRON AI...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Sign-in failed</h2>
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 text-left">
              {errorMessage}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <NeonButton
                size="md"
                onClick={handleTryAgain}
                className="w-full flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>Try Again</span>
              </NeonButton>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=signin', { replace: true })}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
