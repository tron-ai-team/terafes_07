import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import type { CandidateProfile } from '../types/careerCenter';
import { ApiError } from '../services/httpClient';
import { UserRound, Save, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';

function listToLines(values?: string[]): string {
  return (values || []).join('\n');
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const CandidateProfilePage: React.FC = () => {
  const { addToast, uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [skillsText, setSkillsText] = useState('');
  const [languagesText, setLanguagesText] = useState('');
  const [educationText, setEducationText] = useState('');
  const [careerText, setCareerText] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await careerCenterClient.getProfile();
      setProfile(data);
      setSkillsText(listToLines(data.skills));
      setLanguagesText(listToLines(data.languages));
      setEducationText(
        (data.education || [])
          .map((e) => [e.school, e.detail].filter(Boolean).join(' — '))
          .join('\n')
      );
      setCareerText(
        (data.career || [])
          .map((c) => [c.organization, c.role, c.period].filter(Boolean).join(' / '))
          .join('\n')
      );
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Failed to load profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
    setProfile((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const education = educationText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [school, detail] = line.split('—').map((s) => s.trim());
          return { school: school || line, detail: detail || '' };
        });
      const career = careerText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split('/').map((s) => s.trim());
          return {
            organization: parts[0] || line,
            role: parts[1] || '',
            period: parts[2] || '',
          };
        });
      const saved = await careerCenterClient.upsertProfile({
        fullName: profile.fullName || '',
        nameJa: profile.nameJa || '',
        furigana: profile.furigana || '',
        dateOfBirth: profile.dateOfBirth || null,
        nationality: profile.nationality || '',
        addressText: profile.addressText || '',
        email: profile.email || '',
        phone: profile.phone || '',
        education,
        career,
        skills: linesToList(skillsText),
        languages: linesToList(languagesText),
        selfPr: profile.selfPr || '',
        careerGoals: profile.careerGoals || '',
        motivation: profile.motivation || '',
        preferences: profile.preferences || {},
        confirmedFields: profile.confirmedFields || [],
        allowOverwriteConfirmed: true,
      });
      setProfile(saved);
      addToast(ja ? '候補者プロフィールを保存しました' : 'Candidate profile saved', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Save failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {ja ? 'プロフィールを読み込み中…' : 'Loading candidate profile…'}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
            <UserRound className="w-4 h-4" />
            Career Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {ja ? '候補者プロフィール' : 'Candidate Profile'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {ja
              ? 'CV Builder・求人検索・企業分析で共有されるマスタープロフィールです。'
              : 'Shared master profile used by CV Builder, Job Finder, and Company Analysis.'}
          </p>
        </div>
        <div className="flex gap-2">
          <NeonButton variant="secondary" onClick={() => void load()} icon={<RefreshCw className="w-4 h-4" />}>
            {ja ? '再読込' : 'Reload'}
          </NeonButton>
          <NeonButton onClick={() => void handleSave()} disabled={saving} icon={<Save className="w-4 h-4" />}>
            {saving ? (ja ? '保存中…' : 'Saving…') : ja ? '保存' : 'Save'}
          </NeonButton>
        </div>
      </div>

      {typeof profile?.completenessScore === 'number' && (
        <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Completeness</div>
            <div className="text-2xl font-bold text-slate-900">{profile.completenessScore}%</div>
          </div>
          {(profile.missingFields?.length || 0) > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-xl">
              Missing: {profile.missingFields?.join(', ')}
            </div>
          )}
          <Link
            to="/career/cv-builder"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
          >
            {ja ? 'CV Builderへ' : 'Open CV Builder'} <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <GlassCard className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              ['fullName', ja ? '氏名 (ローマ字)' : 'Full name'],
              ['nameJa', ja ? '氏名 (日本語)' : 'Name (Japanese)'],
              ['furigana', 'フリガナ'],
              ['dateOfBirth', ja ? '生年月日 (YYYY-MM-DD)' : 'Date of birth'],
              ['nationality', ja ? '国籍' : 'Nationality'],
              ['email', 'Email'],
              ['phone', ja ? '電話' : 'Phone'],
            ] as Array<[keyof CandidateProfile, string]>
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">{label}</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={String(profile?.[key] ?? '')}
                onChange={(e) => updateField(key, e.target.value as any)}
              />
            </label>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">{ja ? '住所' : 'Address'}</span>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={profile?.addressText || ''}
            onChange={(e) => updateField('addressText', e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">{ja ? '学歴 (1行1件: 学校 — 詳細)' : 'Education (one per line)'}</span>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[88px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={educationText}
            onChange={(e) => setEducationText(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">{ja ? '職歴 (組織 / 役割 / 期間)' : 'Career (org / role / period)'}</span>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[88px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={careerText}
            onChange={(e) => setCareerText(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">{ja ? 'スキル (改行区切り)' : 'Skills'}</span>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">{ja ? '言語' : 'Languages'}</span>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
            />
          </label>
        </div>
        {(
          [
            ['selfPr', ja ? '自己PR' : 'Self PR'],
            ['careerGoals', ja ? 'キャリア目標' : 'Career goals'],
            ['motivation', ja ? '志望動機' : 'Motivation'],
          ] as Array<[keyof CandidateProfile, string]>
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">{label}</span>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[96px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={String(profile?.[key] ?? '')}
              onChange={(e) => updateField(key, e.target.value as any)}
            />
          </label>
        ))}
      </GlassCard>
    </div>
  );
};
