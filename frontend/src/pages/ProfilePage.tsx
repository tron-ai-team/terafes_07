import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { User, Award, FileText, Globe, LogOut, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, uiLanguage } = useApp();

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto my-auto text-center space-y-4 py-12">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">You are currently in Guest Mode</h2>
        <p className="text-xs text-slate-500">
          Sign in or create an account to persist your interview history and custom profile.
        </p>
        <NeonButton onClick={() => navigate('/auth')}>
          Sign In / Create Account
        </NeonButton>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 select-none py-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            User Profile & Credentials
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal profile, target engineering roles, and Japanese certifications.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">{user.name}</h3>
            <p className="text-xs text-slate-500">Signed in as: {user.email}</p>
          </div>
          <div className="pt-2 space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium block">Authentication:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {user.authProviders?.includes('GOOGLE') && user.authProviders?.includes('PASSWORD')
                ? 'Password + Google'
                : user.authProviders?.includes('GOOGLE')
                ? 'Google'
                : 'Password'}
            </span>
          </div>
        </GlassCard>

        <div className="md:col-span-2 space-y-4">
          <GlassCard className="p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 border-b border-blue-50 pb-2">
              Career & Qualifications
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Target Role:</span>
                <div className="font-bold text-slate-800 mt-0.5">{user.targetRole || 'Backend Engineer'}</div>
              </div>
              <div>
                <span className="text-slate-400">JLPT Level:</span>
                <div className="font-bold text-blue-600 mt-0.5">{user.jlptLevel || 'N2'}</div>
              </div>
              <div>
                <span className="text-slate-400">Uploaded CV:</span>
                <div className="font-bold text-slate-800 mt-0.5">{user.cvFileName || 'None uploaded'}</div>
              </div>
              <div>
                <span className="text-slate-400">Interview Readiness:</span>
                <div className="font-bold text-emerald-600 mt-0.5">88% (Proficient)</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
