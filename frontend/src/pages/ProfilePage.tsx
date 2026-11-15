import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient, type UserMeWithCandidate } from '../services/careerCenterClient';
import { ApiError } from '../services/httpClient';
import { User, LogOut, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

function dash(value?: string | null): string {
  return value && value.trim() ? value : '—';
}

function listOrEmpty(values?: string[] | null): string {
  if (!values || values.length === 0) return '—';
  return values.join(', ');
}

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<UserMeWithCandidate | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const load = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const data = await careerCenterClient.getUserMe();
      setMe(data);
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
        setPhotoUrl(null);
      }
      if (data.candidateProfile?.hasPhoto) {
        try {
          const url = await careerCenterClient.getProfilePhotoObjectUrl();
          setPhotoUrl(url);
        } catch {
          // Photo optional — do not fail the whole page.
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : err instanceof Error ? err.message : 'Failed to load profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when auth user changes
  }, [isAuthenticated, user?.id]);

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
        <NeonButton onClick={() => navigate('/auth')}>Sign In / Create Account</NeonButton>
      </div>
    );
  }

  const cp = me?.candidateProfile;
  const displayName = cp?.fullName || cp?.nameJa || me?.displayName || user.name || '—';
  const authEmail = me?.email || user.email;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 select-none py-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            User Profile & Credentials
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {ja
              ? '認証情報と、保存済み候補者プロフィールの最新内容を表示します。'
              : 'Authentication details and the latest saved Candidate Profile.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <NeonButton variant="secondary" onClick={() => void load()} icon={<RefreshCw className="w-4 h-4" />}>
            {loading ? (ja ? '読込中…' : 'Loading…') : ja ? '再読込' : 'Reload'}
          </NeonButton>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 text-center space-y-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover mx-auto shadow-md border border-slate-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-md">
              {String(displayName).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-lg text-slate-900 break-words">{displayName}</h3>
            <p className="text-xs text-slate-500 break-all">Signed in as: {authEmail}</p>
            {cp?.contactEmail && cp.contactEmail !== authEmail && (
              <p className="text-xs text-slate-400 mt-1 break-all">Candidate contact: {cp.contactEmail}</p>
            )}
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
          <Link
            to="/career/profile"
            className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
          >
            {ja ? '候補者プロフィールを編集' : 'Edit Candidate Profile'} <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>

        <div className="md:col-span-2 space-y-4">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-50 pb-2">
              <h4 className="font-bold text-sm text-slate-800">
                {ja ? '候補者プロフィール（最新）' : 'Candidate Profile (latest)'}
              </h4>
              <span className="text-xs font-semibold text-slate-600">
                {ja ? '完成度' : 'Completeness'}: {cp?.completenessScore ?? 0}%
              </span>
            </div>

            {loading && !me ? (
              <p className="text-xs text-slate-500">{ja ? '読み込み中…' : 'Loading…'}</p>
            ) : !cp?.profileExists ? (
              <p className="text-xs text-slate-500">
                {ja
                  ? 'まだ候補者プロフィールが保存されていません。編集ページから入力してください。'
                  : 'No Candidate Profile saved yet. Add details from the edit page.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">{ja ? '氏名' : 'Full name'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{dash(cp.fullName || cp.nameJa)}</div>
                </div>
                <div>
                  <span className="text-slate-400">{ja ? '卒業予定年' : 'Graduation year'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{dash(cp.expectedGraduationYear)}</div>
                </div>
                <div>
                  <span className="text-slate-400">{ja ? '希望職種' : 'Target job'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{listOrEmpty(cp.targetJobs)}</div>
                </div>
                <div>
                  <span className="text-slate-400">{ja ? '希望勤務地' : 'Preferred location'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{listOrEmpty(cp.preferredLocations)}</div>
                </div>
                <div>
                  <span className="text-slate-400">JLPT</span>
                  <div className="font-bold text-blue-600 mt-0.5">{dash(cp.jlptLevel)}</div>
                </div>
                <div>
                  <span className="text-slate-400">{ja ? '学歴' : 'Education'}</span>
                  <div className="font-bold text-slate-800 mt-0.5 whitespace-pre-wrap">
                    {cp.education && cp.education.length > 0 ? cp.education.join('\n') : '—'}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">{ja ? '技術スキル' : 'Technical skills'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{listOrEmpty(cp.skills)}</div>
                </div>
                <div>
                  <span className="text-slate-400">{ja ? '資格' : 'Certifications'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{listOrEmpty(cp.certifications)}</div>
                </div>
                <div>
                  <span className="text-slate-400">{ja ? 'プロジェクト' : 'Projects'}</span>
                  <div className="font-bold text-slate-800 mt-0.5">{listOrEmpty(cp.projects)}</div>
                </div>
                {(cp.missingFields?.length || 0) > 0 && (
                  <div className="sm:col-span-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {ja ? '不足項目' : 'Missing'}: {cp.missingFields?.join(', ')}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
