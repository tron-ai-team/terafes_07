import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TronLogo } from '../components/common/TronLogo';
import { FuturisticInput } from '../components/common/FuturisticInput';
import { NeonButton } from '../components/common/NeonButton';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { CORE_API_URL } from '../config/api';
import { authApi } from '../services/httpClient';

type GoogleProviderState = 'LOADING' | 'AVAILABLE' | 'UNAVAILABLE' | 'ERROR';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>(() => {
    return searchParams.get('mode') === 'signin' ? 'signin' : 'signup';
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Provider states: LOADING, AVAILABLE, UNAVAILABLE, ERROR
  const [googleState, setGoogleState] = useState<GoogleProviderState>('LOADING');

  // Preserve redirect parameter if present (e.g. from /connect-device)
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      sessionStorage.setItem('tron_auth_return_url', redirect);
    }
  }, [searchParams]);

  // Check auth providers configuration on mount before rendering final Google state
  useEffect(() => {
    let isMounted = true;
    async function checkProviders() {
      try {
        const providers = await authApi.getProviders();
        if (isMounted) {
          if (providers.google?.enabled === true) {
            setGoogleState('AVAILABLE');
          } else {
            setGoogleState('UNAVAILABLE');
          }
        }
      } catch {
        if (isMounted) {
          setGoogleState('ERROR');
        }
      }
    }
    void checkProviders();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'signin' || urlMode === 'signup') {
      setMode(urlMode);
    }
  }, [searchParams]);

  const handleGoogleSignIn = () => {
    if (googleState !== 'AVAILABLE') return;
    // Canonical browser navigation directly to OAuth endpoint (DO NOT use fetch/XHR)
    window.location.href = `${CORE_API_URL}/oauth2/authorization/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreedToTerms) {
        setError('Please agree to the Terms & Privacy Policy.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        await register(email.trim(), password, fullName.trim());
      } else {
        await login(email.trim(), password);
      }
      const returnUrl = sessionStorage.getItem('tron_auth_return_url');
      if (returnUrl) {
        sessionStorage.removeItem('tron_auth_return_url');
        navigate(returnUrl, { replace: true });
      } else {
        navigate('/chat');
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#F8FCFF] overflow-hidden select-none">
      {/* Background Ambience */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center select-none opacity-90"
        style={{ backgroundImage: `url('/assets/tron-bg.jpg')` }}
      />
      <div className="fixed inset-0 sci-fi-perspective-grid opacity-30 pointer-events-none" />
      <div className="fixed w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />

      {/* Centered Glass Authentication Card */}
      <div className="relative z-10 w-full max-w-[440px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-8 shadow-2xl shadow-blue-500/10 text-center animate-in fade-in duration-300">
        {/* TRON AI Logo Emblem */}
        <div className="flex justify-center mb-3">
          <TronLogo size="hero" />
        </div>

        {/* Title */}
        <div className="flex items-center justify-center gap-1.5 font-display text-2xl font-black tracking-tight text-slate-900">
          <span>TRON</span>
          <span className="text-[#008CFF]">AI</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Welcome to TRON AI
        </p>

        {/* Primary Action: Continue with Google */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={googleState !== 'AVAILABLE'}
            onClick={handleGoogleSignIn}
            className={`w-full py-3 px-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-xs transition-all shadow-sm ${
              googleState === 'AVAILABLE'
                ? 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:shadow-md hover:border-blue-300 active:scale-[0.99] cursor-pointer'
                : googleState === 'LOADING'
                ? 'bg-slate-50 border border-slate-200 text-slate-500 cursor-wait'
                : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
            }`}
          >
            {googleState === 'LOADING' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="font-bold">
              {googleState === 'LOADING' ? 'Checking Google sign-in...' : 'Continue with Google'}
            </span>
          </button>

          {(googleState === 'UNAVAILABLE' || googleState === 'ERROR') && (
            <p className="text-[11px] text-slate-400">
              Google sign-in is not configured in this environment.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
            <span className="bg-white/95 px-3">or continue with email</span>
          </div>
        </div>

        {/* Segmented Pill Selector: Sign In / Create Account */}
        <div className="p-1 rounded-2xl bg-slate-100/80 border border-slate-200/60 flex items-center">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
            }}
            className={`
              flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200
              ${mode === 'signin'
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`
              flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200
              ${mode === 'signup'
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900'
              }
            `}
          >
            Create Account
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-left">
          {mode === 'signup' && (
            <FuturisticInput
              label="Full Name"
              placeholder="Enter your full name"
              icon={<User className="w-4 h-4" />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}

          <FuturisticInput
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <FuturisticInput
            label="Password"
            isPassword
            placeholder={mode === 'signup' ? 'Create a password (min. 8 characters)' : 'Enter your password'}
            icon={<Lock className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {mode === 'signup' && (
            <FuturisticInput
              label="Confirm Password"
              isPassword
              placeholder="Confirm your password"
              icon={<Lock className="w-4 h-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {mode === 'signup' ? (
            <label className="flex items-center gap-2 text-left pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600 leading-tight">
                I agree to the{' '}
                <span className="text-[#008CFF] font-semibold hover:underline">
                  Terms & Privacy Policy
                </span>
              </span>
            </label>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-600 text-[11px]">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setError('Password reset instructions will be sent to your email.')}
                className="text-[11px] text-[#008CFF] font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && <p className="text-xs text-rose-500 text-left font-medium">{error}</p>}

          <NeonButton
            type="submit"
            size="lg"
            isLoading={loading}
            className="w-full mt-2"
          >
            <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </NeonButton>
        </form>

        {/* Bottom Switch Link */}
        <p className="mt-6 text-xs text-slate-500">
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError('');
            }}
            className="text-[#008CFF] font-semibold hover:underline"
          >
            {mode === 'signup' ? 'Sign In' : 'Create Account'}
          </button>
        </p>

        {/* Guest Mode */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <Link
            to="/dashboard"
            className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
          >
            Continue as Guest / ゲストとして体験する →
          </Link>
        </div>
      </div>
    </div>
  );
};
