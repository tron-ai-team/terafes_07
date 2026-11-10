import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Globe2,
  Languages,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import { ApiError } from '../services/httpClient';
import type {
  CandidateProfile,
  CareerEntry,
  CertificationEntry,
  EducationEntry,
  LanguageEntry,
  ProfileAiSuggestResponse,
  ProjectEntry,
  SkillEntry,
} from '../types/careerCenter';
import {
  CAREER_STORY_FIELDS,
  CERT_STATUSES,
  EDUCATION_STATUSES,
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  INPUT_CLASS,
  JOB_TITLE_OPTIONS,
  LANGUAGE_PROFICIENCIES,
  LOCATION_OPTIONS,
  PROFILE_SECTIONS,
  PROJECT_TYPES,
  SCHOOL_TYPES,
  SKILL_CATEGORIES,
  SKILL_PROFICIENCIES,
  TEXTAREA_CLASS,
  WORK_STYLE_OPTIONS,
  type ProfileSectionId,
} from './candidateProfile/profileConstants';
import {
  buildProfileRequest,
  emptyCareer,
  emptyCertification,
  emptyEducation,
  emptyLanguage,
  emptyProject,
  emptySkill,
  localizeMissingFields,
  profileToForm,
  reorderList,
  snapshotKey,
  toggleMulti,
} from './candidateProfile/profileFormUtils';

const Field: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, error, hint, children }) => (
  <label htmlFor={htmlFor} className="block space-y-1.5">
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    {error && <span className="block text-xs text-red-600">{error}</span>}
  </label>
);

const ChipToggle: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
      active
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
    }`}
  >
    {children}
  </button>
);

export const CandidateProfilePage: React.FC = () => {
  const { addToast, uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [suggestingKey, setSuggestingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CandidateProfile | null>(null);
  const [baseline, setBaseline] = useState<string>('');
  const [section, setSection] = useState<ProfileSectionId>('personal');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [confirmEducationMigration, setConfirmEducationMigration] = useState(false);
  const [aiPreview, setAiPreview] = useState<ProfileAiSuggestResponse | null>(null);
  const [customSkill, setCustomSkill] = useState('');
  const [skillCategory, setSkillCategory] = useState<string>(SKILL_CATEGORIES[0]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const dirty = form != null && baseline !== '' && snapshotKey(form) !== baseline;

  const applyLoaded = (data: CandidateProfile) => {
    const next = profileToForm(data);
    setForm(next);
    setBaseline(snapshotKey(next));
    setConfirmEducationMigration(false);
    setFieldErrors({});
    setAiPreview(null);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await careerCenterClient.getProfile();
      applyLoaded(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : (err as Error)?.message || 'Failed to load profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onBeforeUnload = useEffectEvent((e: BeforeUnloadEvent) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  useEffect(() => {
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [onBeforeUnload]);

  const patch = (partial: Partial<CandidateProfile>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const patchStories = (key: string, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const careerStories = { ...(prev.careerStories || {}), [key]: value };
      const next: CandidateProfile = { ...prev, careerStories };
      if (key === 'selfPr') next.selfPr = value;
      if (key === 'careerGoals') next.careerGoals = value;
      if (key === 'generalMotivation') next.motivation = value;
      return next;
    });
  };

  const handleCancel = () => {
    if (dirty && !window.confirm(ja ? '未保存の変更があります。破棄しますか？' : 'Discard unsaved changes?')) {
      return;
    }
    void load();
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    const { request, fieldErrors: errors } = buildProfileRequest(form, { confirmEducationMigration });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaving(false);
      const first = Object.values(errors)[0];
      setError(first);
      addToast(first, 'error');
      if (errors.dateOfBirth) setSection('personal');
      if (errors.urls) setSection('projects');
      return;
    }
    try {
      const saved = await careerCenterClient.upsertProfile(request);
      applyLoaded(saved);
      addToast(ja ? '候補者プロフィールを保存しました' : 'Candidate profile saved', 'success');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : (err as Error)?.message || 'Save failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const saved = await careerCenterClient.uploadProfilePhoto(file);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              photoObjectKey: saved.photoObjectKey,
              completenessScore: saved.completenessScore ?? prev.completenessScore,
              missingFields: saved.missingFields ?? prev.missingFields,
            }
          : prev
      );
      addToast(ja ? '写真をアップロードしました' : 'Photo uploaded', 'success');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : (err as Error)?.message || 'Upload failed';
      addToast(msg, 'error');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const applyEducationSuggestions = () => {
    if (!form?.educationSuggestions?.length) return;
    patch({
      education: form.educationSuggestions.map((s) => ({ ...s, suggested: false, needsReview: false })),
    });
    setConfirmEducationMigration(true);
    addToast(
      ja ? '学歴の提案を適用しました。保存で確定します。' : 'Education suggestions applied. Save to confirm.',
      'success'
    );
  };

  const handleAiSuggest = async (fieldKey: string, currentText: string) => {
    setSuggestingKey(fieldKey);
    setAiPreview(null);
    try {
      const res = await careerCenterClient.suggestProfileText({
        fieldKey,
        currentText,
        language: ja ? 'ja' : 'en',
      });
      setAiPreview(res);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : (err as Error)?.message || 'AI suggest failed';
      addToast(msg, 'error');
    } finally {
      setSuggestingKey(null);
    }
  };

  const acceptAiPreview = () => {
    if (!aiPreview) return;
    const key = aiPreview.fieldKey;
    const text = aiPreview.proposedText || '';
    if (CAREER_STORY_FIELDS.some((f) => f.key === key || f.topLevel === key)) {
      const storyKey =
        CAREER_STORY_FIELDS.find((f) => f.key === key)?.key ||
        CAREER_STORY_FIELDS.find((f) => f.topLevel === key)?.key ||
        key;
      patchStories(storyKey, text);
    } else if (key === 'selfPr' || key === 'careerGoals' || key === 'motivation') {
      if (key === 'motivation') patchStories('generalMotivation', text);
      else patchStories(key, text);
    } else {
      patch({ [key]: text } as Partial<CandidateProfile>);
    }
    setAiPreview(null);
    addToast(ja ? '提案を反映しました（未保存）' : 'Suggestion applied locally (not saved yet)', 'success');
  };

  if (loading || !form) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {ja ? 'プロフィールを読み込み中…' : 'Loading candidate profile…'}
      </div>
    );
  }

  const skills = (form.skills || []) as SkillEntry[];
  const languages = (form.languages || []) as LanguageEntry[];
  const education = form.education || [];
  const career = form.career || [];
  const projects = form.projects || [];
  const certifications = form.certifications || [];
  const prefs = form.preferences || {};
  const intl = form.international || {};
  const showEduBanner =
    Boolean(form.educationLegacyText?.trim()) || (form.educationSuggestions?.length || 0) > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
            <UserRound className="w-4 h-4" />
            Career Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {ja ? '候補者プロフィール' : 'Candidate Profile'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {ja
              ? 'CV Builder・求人検索・企業分析で共有されるマスタープロフィールです。'
              : 'Shared master profile used by CV Builder, Job Finder, and Company Analysis.'}
          </p>
          {dirty && (
            <p className="text-xs font-semibold text-amber-700 mt-2">
              {ja ? '未保存の変更があります' : 'You have unsaved changes'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <NeonButton variant="secondary" onClick={handleCancel} icon={<RefreshCw className="w-4 h-4" />}>
            {ja ? 'キャンセル' : 'Cancel'}
          </NeonButton>
          <NeonButton onClick={() => void handleSave()} disabled={saving} isLoading={saving} icon={<Save className="w-4 h-4" />}>
            {saving ? (ja ? '保存中…' : 'Saving…') : ja ? '保存' : 'Save'}
          </NeonButton>
        </div>
      </div>

      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase">
            {ja ? '完成度' : 'Completeness'}
          </div>
          <div className="text-2xl font-bold text-slate-900">{form.completenessScore ?? 0}%</div>
          <div className="mt-2 h-2 w-40 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#008CFF] to-[#0066FF]"
              style={{ width: `${Math.min(100, Math.max(0, form.completenessScore ?? 0))}%` }}
            />
          </div>
        </div>
        {(form.missingFields?.length || 0) > 0 && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-xl">
            <span className="font-semibold">{ja ? '不足項目: ' : 'Missing: '}</span>
            {localizeMissingFields(form.missingFields, ja).join(', ')}
          </div>
        )}
        <Link
          to="/career/cv-builder"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
        >
          {ja ? 'CV Builderへ' : 'Open CV Builder'} <ArrowRight className="w-4 h-4" />
        </Link>
      </GlassCard>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="lg:hidden -mx-1 overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max px-1">
          {PROFILE_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border whitespace-nowrap ${
                section === s.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {ja ? s.ja : s.en}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <nav className="hidden lg:block space-y-1 sticky top-24 self-start" aria-label="Profile sections">
          {PROFILE_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                section === s.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {ja ? s.ja : s.en}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {section === 'personal' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {ja ? '基本情報' : 'Personal Information'}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                  {form.photoObjectKey ? (
                    <span className="text-[10px] px-1 text-center break-all">{form.photoObjectKey.slice(0, 24)}</span>
                  ) : (
                    <UserRound className="w-7 h-7" />
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void handlePhoto(e.target.files?.[0] || null)}
                />
                <NeonButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={uploadingPhoto}
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {ja ? '写真をアップロード' : 'Upload photo'}
                </NeonButton>
                <span className="text-[11px] text-slate-400">
                  {ja ? '任意・保存とは別にアップロードされます' : 'Optional — uploads immediately'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={ja ? '氏名（ローマ字）' : 'Full name'}>
                  <input className={INPUT_CLASS} value={form.fullName || ''} onChange={(e) => patch({ fullName: e.target.value })} />
                </Field>
                <Field label={ja ? '氏名（日本語）' : 'Name (Japanese)'}>
                  <input className={INPUT_CLASS} value={form.nameJa || ''} onChange={(e) => patch({ nameJa: e.target.value })} />
                </Field>
                <Field label="フリガナ">
                  <input className={INPUT_CLASS} value={form.furigana || ''} onChange={(e) => patch({ furigana: e.target.value })} />
                </Field>
                <Field
                  label={ja ? '生年月日' : 'Date of birth'}
                  error={fieldErrors.dateOfBirth}
                  hint={ja ? 'YYYY-MM-DD（下の日付ピッカーも利用可）' : 'YYYY-MM-DD (or use the date picker)'}
                >
                  <div className="flex gap-2">
                    <input
                      className={INPUT_CLASS}
                      value={String(form.dateOfBirth || '')}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, dateOfBirth: '' }));
                        patch({ dateOfBirth: e.target.value });
                      }}
                      placeholder="YYYY-MM-DD"
                    />
                    <input
                      type="date"
                      className={`${INPUT_CLASS} max-w-[11rem]`}
                      value={/^\d{4}-\d{2}-\d{2}$/.test(String(form.dateOfBirth || '')) ? String(form.dateOfBirth) : ''}
                      onChange={(e) => {
                        setFieldErrors((prev) => ({ ...prev, dateOfBirth: '' }));
                        patch({ dateOfBirth: e.target.value });
                      }}
                      aria-label={ja ? '日付ピッカー' : 'Date picker'}
                    />
                  </div>
                </Field>
                <Field label={ja ? '国籍' : 'Nationality'}>
                  <input className={INPUT_CLASS} value={form.nationality || ''} onChange={(e) => patch({ nationality: e.target.value })} />
                </Field>
                <Field label={ja ? '性別（任意）' : 'Gender (optional)'}>
                  <select className={INPUT_CLASS} value={form.gender || ''} onChange={(e) => patch({ gender: e.target.value })}>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g || 'blank'} value={g}>
                        {g || (ja ? '未選択' : 'Not specified')}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Email">
                  <input type="email" className={INPUT_CLASS} value={form.email || ''} onChange={(e) => patch({ email: e.target.value })} />
                </Field>
                <Field label={ja ? '電話' : 'Phone'}>
                  <input className={INPUT_CLASS} value={form.phone || ''} onChange={(e) => patch({ phone: e.target.value })} />
                </Field>
                <Field label={ja ? '郵便番号' : 'Postal code'}>
                  <input className={INPUT_CLASS} value={form.postalCode || ''} onChange={(e) => patch({ postalCode: e.target.value })} />
                </Field>
                <Field label={ja ? '都道府県' : 'Prefecture'}>
                  <input className={INPUT_CLASS} value={form.prefecture || ''} onChange={(e) => patch({ prefecture: e.target.value })} />
                </Field>
                <Field label={ja ? '市区町村' : 'City'}>
                  <input className={INPUT_CLASS} value={form.city || ''} onChange={(e) => patch({ city: e.target.value })} />
                </Field>
                <Field label={ja ? '番地' : 'Street address'}>
                  <input className={INPUT_CLASS} value={form.streetAddress || ''} onChange={(e) => patch({ streetAddress: e.target.value })} />
                </Field>
                <Field label={ja ? '建物名など' : 'Building'}>
                  <input className={INPUT_CLASS} value={form.building || ''} onChange={(e) => patch({ building: e.target.value })} />
                </Field>
              </div>
              <Field label={ja ? '住所（自由記述）' : 'Address (free text)'}>
                <textarea
                  className={TEXTAREA_CLASS}
                  value={form.addressText || ''}
                  onChange={(e) => patch({ addressText: e.target.value })}
                />
              </Field>
            </GlassCard>
          )}

          {section === 'education' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  {ja ? '学歴' : 'Education'}
                </h2>
                <NeonButton
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => patch({ education: [...education, emptyEducation()] })}
                >
                  {ja ? '追加' : 'Add'}
                </NeonButton>
              </div>

              {showEduBanner && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2 text-sm text-amber-900">
                  <p className="font-semibold">
                    {ja ? '学歴データの確認が必要です' : 'Education review needed'}
                  </p>
                  {form.educationLegacyText?.trim() && (
                    <pre className="whitespace-pre-wrap text-xs bg-white/70 rounded-lg p-2 border border-amber-100 max-h-32 overflow-auto">
                      {form.educationLegacyText}
                    </pre>
                  )}
                  {(form.educationSuggestions?.length || 0) > 0 && (
                    <NeonButton size="sm" onClick={applyEducationSuggestions}>
                      {ja ? '提案を適用して移行を確認' : 'Apply suggestions & confirm migration'}
                    </NeonButton>
                  )}
                  {confirmEducationMigration && (
                    <p className="text-xs font-semibold text-emerald-700">
                      {ja ? '保存時に confirmEducationMigration: true を送信します' : 'Will send confirmEducationMigration: true on Save'}
                    </p>
                  )}
                </div>
              )}

              {education.length === 0 && (
                <p className="text-sm text-slate-500">{ja ? '学歴がまだありません。' : 'No education entries yet.'}</p>
              )}

              {education.map((row, index) => (
                <EducationCard
                  key={row.id || index}
                  row={row}
                  ja={ja}
                  index={index}
                  total={education.length}
                  onChange={(next) => {
                    const list = [...education];
                    list[index] = next;
                    patch({ education: list });
                  }}
                  onDelete={() => patch({ education: education.filter((_, i) => i !== index) })}
                  onMove={(dir) => patch({ education: reorderList(education, index, index + dir) })}
                />
              ))}
            </GlassCard>
          )}

          {section === 'experience' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  {ja ? '職歴' : 'Work Experience'}
                </h2>
                <NeonButton
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(form.noWorkExperience)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => patch({ career: [...career, emptyCareer()], noWorkExperience: false })}
                >
                  {ja ? '追加' : 'Add'}
                </NeonButton>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.noWorkExperience)}
                  onChange={(e) =>
                    patch({
                      noWorkExperience: e.target.checked,
                      career: e.target.checked ? [] : career,
                    })
                  }
                />
                {ja ? '職務経験なし（新卒など）' : 'No professional work experience'}
              </label>

              {!form.noWorkExperience &&
                career.map((row, index) => (
                  <CareerCard
                    key={row.id || index}
                    row={row}
                    ja={ja}
                    index={index}
                    total={career.length}
                    onChange={(next) => {
                      const list = [...career];
                      list[index] = next;
                      patch({ career: list });
                    }}
                    onDelete={() => patch({ career: career.filter((_, i) => i !== index) })}
                    onMove={(dir) => patch({ career: reorderList(career, index, index + dir) })}
                  />
                ))}
            </GlassCard>
          )}

          {section === 'skills' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {ja ? '技術スキル' : 'Technical Skills'}
              </h2>
              <p className="text-xs text-slate-500">
                {ja
                  ? '習熟度は任意です。未設定のままにして構いません（Expert を自動設定しません）。'
                  : 'Proficiency is optional — leave blank if unsure (never invent Expert).'}
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_CATEGORIES.map((cat) => (
                  <ChipToggle key={cat} active={skillCategory === cat} onClick={() => setSkillCategory(cat)}>
                    {cat}
                  </ChipToggle>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className={INPUT_CLASS}
                  placeholder={ja ? 'スキル名を追加…' : 'Add skill name…'}
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const name = customSkill.trim();
                      if (!name) return;
                      patch({ skills: [...skills, { ...emptySkill(skillCategory), name, proficiency: '' }] });
                      setCustomSkill('');
                    }
                  }}
                />
                <NeonButton
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const name = customSkill.trim();
                    if (!name) return;
                    patch({ skills: [...skills, { ...emptySkill(skillCategory), name, proficiency: '' }] });
                    setCustomSkill('');
                  }}
                >
                  {ja ? '追加' : 'Add'}
                </NeonButton>
              </div>
              <div className="space-y-2">
                {skills.map((skill, index) => (
                  <div
                    key={skill.id || `${skill.name}-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <Field label={ja ? 'スキル' : 'Skill'}>
                      <input
                        className={INPUT_CLASS}
                        value={skill.name}
                        onChange={(e) => {
                          const list = [...skills];
                          list[index] = { ...skill, name: e.target.value };
                          patch({ skills: list });
                        }}
                      />
                    </Field>
                    <Field label={ja ? 'カテゴリ' : 'Category'}>
                      <select
                        className={INPUT_CLASS}
                        value={skill.category || 'Other'}
                        onChange={(e) => {
                          const list = [...skills];
                          list[index] = { ...skill, category: e.target.value };
                          patch({ skills: list });
                        }}
                      >
                        {SKILL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={ja ? '習熟度（任意）' : 'Proficiency (optional)'}>
                      <select
                        className={INPUT_CLASS}
                        value={skill.proficiency || ''}
                        onChange={(e) => {
                          const list = [...skills];
                          list[index] = { ...skill, proficiency: e.target.value };
                          patch({ skills: list });
                        }}
                      >
                        {SKILL_PROFICIENCIES.map((p) => (
                          <option key={p || 'none'} value={p}>
                            {p || (ja ? '未設定' : 'Not set')}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 text-red-600 h-10 w-10 hover:bg-red-50"
                      aria-label={ja ? '削除' : 'Delete'}
                      onClick={() => patch({ skills: skills.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {section === 'projects' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  {ja ? 'プロジェクト・ポートフォリオ' : 'Projects & Portfolio'}
                </h2>
                <NeonButton
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const row = emptyProject();
                    patch({ projects: [...projects, row] });
                    setExpandedProjects((prev) => ({ ...prev, [row.id!]: true }));
                  }}
                >
                  {ja ? '追加' : 'Add'}
                </NeonButton>
              </div>
              {fieldErrors.urls && <p className="text-xs text-red-600">{fieldErrors.urls}</p>}
              {projects.map((row, index) => {
                const open = expandedProjects[row.id || String(index)] ?? false;
                return (
                  <div key={row.id || index} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      onClick={() =>
                        setExpandedProjects((prev) => ({
                          ...prev,
                          [row.id || String(index)]: !open,
                        }))
                      }
                    >
                      <span className="font-semibold text-slate-800 text-sm">
                        {row.name || (ja ? '無題のプロジェクト' : 'Untitled project')}
                      </span>
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                        <ProjectFields
                          row={row}
                          ja={ja}
                          onChange={(next) => {
                            const list = [...projects];
                            list[index] = next;
                            patch({ projects: list });
                          }}
                        />
                        <div className="flex gap-2">
                          <NeonButton
                            size="sm"
                            variant="danger"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => patch({ projects: projects.filter((_, i) => i !== index) })}
                          >
                            {ja ? '削除' : 'Delete'}
                          </NeonButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </GlassCard>
          )}

          {section === 'certsLangs' && (
            <div className="space-y-4">
              <GlassCard className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 font-display">
                    {ja ? '資格・認定' : 'Certifications'}
                  </h2>
                  <NeonButton
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => patch({ certifications: [...certifications, emptyCertification()] })}
                  >
                    {ja ? '追加' : 'Add'}
                  </NeonButton>
                </div>
                {certifications.map((row, index) => (
                  <CertCard
                    key={row.id || index}
                    row={row}
                    ja={ja}
                    onChange={(next) => {
                      const list = [...certifications];
                      list[index] = next;
                      patch({ certifications: list });
                    }}
                    onDelete={() => patch({ certifications: certifications.filter((_, i) => i !== index) })}
                  />
                ))}
              </GlassCard>

              <GlassCard className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                    <Languages className="w-5 h-5 text-blue-600" />
                    {ja ? '語学' : 'Languages'}
                  </h2>
                  <NeonButton
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => patch({ languages: [...languages, emptyLanguage()] })}
                  >
                    {ja ? '追加' : 'Add'}
                  </NeonButton>
                </div>
                {languages.map((row, index) => (
                  <div
                    key={row.id || index}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3"
                  >
                    <Field label={ja ? '言語' : 'Language'}>
                      <input
                        className={INPUT_CLASS}
                        value={row.language}
                        onChange={(e) => {
                          const list = [...languages];
                          list[index] = { ...row, language: e.target.value };
                          patch({ languages: list });
                        }}
                      />
                    </Field>
                    <Field label={ja ? '習熟度' : 'Proficiency'}>
                      <select
                        className={INPUT_CLASS}
                        value={row.proficiency || ''}
                        onChange={(e) => {
                          const list = [...languages];
                          list[index] = { ...row, proficiency: e.target.value };
                          patch({ languages: list });
                        }}
                      >
                        {LANGUAGE_PROFICIENCIES.map((p) => (
                          <option key={p || 'none'} value={p}>
                            {p || (ja ? '未設定' : 'Not set')}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={ja ? '資格' : 'Certification'}>
                      <input
                        className={INPUT_CLASS}
                        value={row.certification || ''}
                        onChange={(e) => {
                          const list = [...languages];
                          list[index] = { ...row, certification: e.target.value };
                          patch({ languages: list });
                        }}
                      />
                    </Field>
                    <Field label={ja ? 'スコア' : 'Score'}>
                      <input
                        className={INPUT_CLASS}
                        value={row.score || ''}
                        onChange={(e) => {
                          const list = [...languages];
                          list[index] = { ...row, score: e.target.value };
                          patch({ languages: list });
                        }}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <NeonButton
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => patch({ languages: languages.filter((_, i) => i !== index) })}
                      >
                        {ja ? '削除' : 'Delete'}
                      </NeonButton>
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          )}

          {section === 'preferences' && (
            <GlassCard className="p-5 sm:p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {ja ? '希望条件' : 'Career Preferences'}
              </h2>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">{ja ? '希望職種' : 'Desired job titles'}</div>
                <div className="flex flex-wrap gap-2">
                  {JOB_TITLE_OPTIONS.map((t) => (
                    <ChipToggle
                      key={t}
                      active={(prefs.desiredJobTitles || []).includes(t)}
                      onClick={() =>
                        patch({
                          preferences: {
                            ...prefs,
                            desiredJobTitles: toggleMulti(prefs.desiredJobTitles, t),
                          },
                        })
                      }
                    >
                      {t}
                    </ChipToggle>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">{ja ? '希望勤務地' : 'Preferred locations'}</div>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_OPTIONS.map((t) => (
                    <ChipToggle
                      key={t}
                      active={(prefs.preferredLocations || []).includes(t)}
                      onClick={() =>
                        patch({
                          preferences: {
                            ...prefs,
                            preferredLocations: toggleMulti(prefs.preferredLocations, t),
                            preferredPrefectures: toggleMulti(prefs.preferredPrefectures, t),
                          },
                        })
                      }
                    >
                      {t}
                    </ChipToggle>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">
                  {ja ? '雇用形態・区分' : 'Employment types'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                    <ChipToggle
                      key={t}
                      active={(prefs.preferredEmploymentTypes || []).includes(t)}
                      onClick={() =>
                        patch({
                          preferences: {
                            ...prefs,
                            preferredEmploymentTypes: toggleMulti(prefs.preferredEmploymentTypes, t),
                          },
                        })
                      }
                    >
                      {t}
                    </ChipToggle>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={ja ? '卒業見込年' : 'Expected graduation year'}>
                  <input
                    className={INPUT_CLASS}
                    placeholder="2027"
                    value={prefs.expectedGraduationYear || ''}
                    onChange={(e) =>
                      patch({ preferences: { ...prefs, expectedGraduationYear: e.target.value } })
                    }
                  />
                </Field>
                <Field label={ja ? '働き方' : 'Work style preference'}>
                  <select
                    className={INPUT_CLASS}
                    value={prefs.workStylePreference || ''}
                    onChange={(e) =>
                      patch({ preferences: { ...prefs, workStylePreference: e.target.value } })
                    }
                  >
                    <option value="">{ja ? '未選択' : 'Not specified'}</option>
                    {WORK_STYLE_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={ja ? '希望開始時期' : 'Desired start date'}>
                  <input
                    className={INPUT_CLASS}
                    value={prefs.desiredStartDate || ''}
                    onChange={(e) =>
                      patch({ preferences: { ...prefs, desiredStartDate: e.target.value } })
                    }
                  />
                </Field>
                <Field label={ja ? '希望年収' : 'Desired salary'}>
                  <input
                    className={INPUT_CLASS}
                    value={prefs.desiredSalary || ''}
                    onChange={(e) =>
                      patch({ preferences: { ...prefs, desiredSalary: e.target.value } })
                    }
                  />
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(prefs.willingnessToRelocate)}
                  onChange={(e) =>
                    patch({ preferences: { ...prefs, willingnessToRelocate: e.target.checked } })
                  }
                />
                {ja ? '転勤・移住可能' : 'Willing to relocate'}
              </label>
            </GlassCard>
          )}

          {section === 'stories' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {ja ? '自己PR・キャリアストーリー' : 'Self PR & Career Stories'}
              </h2>
              {CAREER_STORY_FIELDS.map((field) => {
                const value = String(form.careerStories?.[field.key] ?? '');
                return (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-600">{ja ? field.ja : field.en}</span>
                      <NeonButton
                        size="sm"
                        variant="ghost"
                        isLoading={suggestingKey === field.key}
                        icon={<Sparkles className="w-3.5 h-3.5" />}
                        onClick={() => void handleAiSuggest(field.key, value)}
                      >
                        {ja ? 'AI提案' : 'AI suggest'}
                      </NeonButton>
                    </div>
                    {(field.hintEn || field.hintJa) && (
                      <p className="text-[11px] text-slate-400">{ja ? field.hintJa : field.hintEn}</p>
                    )}
                    <textarea
                      className={TEXTAREA_CLASS}
                      value={value}
                      onChange={(e) => patchStories(field.key, e.target.value)}
                    />
                  </div>
                );
              })}

              {aiPreview && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <Sparkles className="w-4 h-4" />
                    {ja ? 'AI提案プレビュー' : 'AI suggestion preview'}
                    <span className="text-xs font-medium text-indigo-600">({aiPreview.fieldKey})</span>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-400">{ja ? '原文' : 'Original'}</div>
                    <p className="text-slate-600 whitespace-pre-wrap">{aiPreview.originalText || '—'}</p>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-400">{ja ? '提案' : 'Suggested'}</div>
                    <p className="text-slate-900 whitespace-pre-wrap font-medium">{aiPreview.proposedText || '—'}</p>
                  </div>
                  {aiPreview.reason && <p className="text-xs text-slate-500">{aiPreview.reason}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={acceptAiPreview}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" /> {ja ? '反映' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPreview(null)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold"
                    >
                      <X className="w-3.5 h-3.5" /> {ja ? '却下' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {section === 'international' && (
            <GlassCard className="p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-blue-600" />
                {ja ? '留学生情報（任意）' : 'International Student Info (optional)'}
              </h2>
              <p className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                {ja
                  ? 'このセクションは任意です。在留資格などの情報はプライバシーに配慮して取り扱われ、必須ではありません。'
                  : 'This section is optional and never required. Residence and eligibility details are privacy-sensitive — share only what you are comfortable providing.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    ['currentCountry', ja ? '現在の国' : 'Current country'],
                    ['nationality', ja ? '国籍' : 'Nationality'],
                    ['residenceStatus', ja ? '在留資格' : 'Residence status'],
                    ['residenceExpiration', ja ? '在留期限' : 'Residence expiration'],
                    ['workEligibility', ja ? '就労可否' : 'Work eligibility'],
                    ['japaneseProficiency', ja ? '日本語能力' : 'Japanese proficiency'],
                    ['otherLanguages', ja ? 'その他の言語' : 'Other languages'],
                  ] as Array<[keyof typeof intl, string]>
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      className={INPUT_CLASS}
                      value={String(intl[key] ?? '')}
                      onChange={(e) =>
                        patch({ international: { ...intl, [key]: e.target.value } })
                      }
                    />
                  </Field>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

function MoveDeleteBar({
  ja,
  index,
  total,
  onMove,
  onDelete,
}: {
  ja: boolean;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <NeonButton size="sm" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}>
        {ja ? '上へ' : 'Up'}
      </NeonButton>
      <NeonButton size="sm" variant="ghost" disabled={index >= total - 1} onClick={() => onMove(1)}>
        {ja ? '下へ' : 'Down'}
      </NeonButton>
      <NeonButton size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete}>
        {ja ? '削除' : 'Delete'}
      </NeonButton>
    </div>
  );
}

function EducationCard({
  row,
  ja,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  row: EducationEntry;
  ja: boolean;
  index: number;
  total: number;
  onChange: (row: EducationEntry) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={ja ? '学校名' : 'School name'}>
          <input
            className={INPUT_CLASS}
            value={row.schoolName || ''}
            onChange={(e) => onChange({ ...row, schoolName: e.target.value, school: e.target.value })}
          />
        </Field>
        <Field label={ja ? '学校名（日本語）' : 'School name (JA)'}>
          <input
            className={INPUT_CLASS}
            value={row.schoolNameJa || ''}
            onChange={(e) => onChange({ ...row, schoolNameJa: e.target.value })}
          />
        </Field>
        <Field label={ja ? '学校区分' : 'School type'}>
          <select
            className={INPUT_CLASS}
            value={row.schoolType || 'Other'}
            onChange={(e) => onChange({ ...row, schoolType: e.target.value })}
          >
            {SCHOOL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label={ja ? '状況' : 'Status'}>
          <select
            className={INPUT_CLASS}
            value={row.status || 'Other'}
            onChange={(e) => onChange({ ...row, status: e.target.value })}
          >
            {EDUCATION_STATUSES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label={ja ? '国' : 'Country'}>
          <input className={INPUT_CLASS} value={row.country || ''} onChange={(e) => onChange({ ...row, country: e.target.value })} />
        </Field>
        <Field label={ja ? '学部・学科' : 'Department'}>
          <input className={INPUT_CLASS} value={row.department || ''} onChange={(e) => onChange({ ...row, department: e.target.value })} />
        </Field>
        <Field label={ja ? 'コース' : 'Course'}>
          <input className={INPUT_CLASS} value={row.course || ''} onChange={(e) => onChange({ ...row, course: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={ja ? '開始年' : 'Start year'}>
            <input
              type="number"
              className={INPUT_CLASS}
              value={row.startYear ?? ''}
              onChange={(e) => onChange({ ...row, startYear: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label={ja ? '開始月' : 'Start month'}>
            <input
              type="number"
              min={1}
              max={12}
              className={INPUT_CLASS}
              value={row.startMonth ?? ''}
              onChange={(e) => onChange({ ...row, startMonth: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={ja ? '終了年' : 'End year'}>
            <input
              type="number"
              className={INPUT_CLASS}
              value={row.endYear ?? ''}
              onChange={(e) => onChange({ ...row, endYear: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label={ja ? '終了月' : 'End month'}>
            <input
              type="number"
              min={1}
              max={12}
              className={INPUT_CLASS}
              value={row.endMonth ?? ''}
              onChange={(e) => onChange({ ...row, endMonth: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        </div>
      </div>
      <MoveDeleteBar ja={ja} index={index} total={total} onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

function CareerCard({
  row,
  ja,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  row: CareerEntry;
  ja: boolean;
  index: number;
  total: number;
  onChange: (row: CareerEntry) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={ja ? '会社・組織' : 'Company / organization'}>
          <input
            className={INPUT_CLASS}
            value={row.company || row.organization || ''}
            onChange={(e) => onChange({ ...row, company: e.target.value, organization: e.target.value })}
          />
        </Field>
        <Field label={ja ? '職種・役割' : 'Job title / role'}>
          <input
            className={INPUT_CLASS}
            value={row.jobTitle || row.role || ''}
            onChange={(e) => onChange({ ...row, jobTitle: e.target.value, role: e.target.value })}
          />
        </Field>
        <Field label={ja ? '雇用形態' : 'Employment type'}>
          <input className={INPUT_CLASS} value={row.employmentType || ''} onChange={(e) => onChange({ ...row, employmentType: e.target.value })} />
        </Field>
        <Field label={ja ? '開始' : 'Start date'}>
          <input className={INPUT_CLASS} value={row.startDate || ''} onChange={(e) => onChange({ ...row, startDate: e.target.value })} placeholder="YYYY-MM" />
        </Field>
        <Field label={ja ? '終了' : 'End date'}>
          <input
            className={INPUT_CLASS}
            value={row.endDate || ''}
            disabled={Boolean(row.currentlyEmployed)}
            onChange={(e) => onChange({ ...row, endDate: e.target.value })}
            placeholder="YYYY-MM"
          />
        </Field>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 mt-6">
          <input
            type="checkbox"
            checked={Boolean(row.currentlyEmployed)}
            onChange={(e) => onChange({ ...row, currentlyEmployed: e.target.checked, endDate: e.target.checked ? '' : row.endDate })}
          />
          {ja ? '在職中' : 'Currently employed'}
        </label>
        <Field label={ja ? '業務内容' : 'Responsibilities'}>
          <textarea className={TEXTAREA_CLASS} value={row.responsibilities || ''} onChange={(e) => onChange({ ...row, responsibilities: e.target.value })} />
        </Field>
        <Field label={ja ? '成果' : 'Achievements'}>
          <textarea className={TEXTAREA_CLASS} value={row.achievements || ''} onChange={(e) => onChange({ ...row, achievements: e.target.value })} />
        </Field>
        <Field label={ja ? '技術（カンマ区切り）' : 'Technologies (comma-separated)'}>
          <input
            className={INPUT_CLASS}
            value={(row.technologies || []).join(', ')}
            onChange={(e) =>
              onChange({
                ...row,
                technologies: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      </div>
      <MoveDeleteBar ja={ja} index={index} total={total} onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

function ProjectFields({
  row,
  ja,
  onChange,
}: {
  row: ProjectEntry;
  ja: boolean;
  onChange: (row: ProjectEntry) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label={ja ? 'プロジェクト名' : 'Project name'}>
        <input className={INPUT_CLASS} value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} />
      </Field>
      <Field label={ja ? '種類' : 'Type'}>
        <select className={INPUT_CLASS} value={row.projectType || ''} onChange={(e) => onChange({ ...row, projectType: e.target.value })}>
          {PROJECT_TYPES.map((t) => (
            <option key={t || 'blank'} value={t}>
              {t || (ja ? '未選択' : 'Not specified')}
            </option>
          ))}
        </select>
      </Field>
      <Field label={ja ? '役割' : 'Role'}>
        <input className={INPUT_CLASS} value={row.role || ''} onChange={(e) => onChange({ ...row, role: e.target.value })} />
      </Field>
      <Field label={ja ? '技術（カンマ区切り）' : 'Technologies'}>
        <input
          className={INPUT_CLASS}
          value={(row.technologies || []).join(', ')}
          onChange={(e) =>
            onChange({
              ...row,
              technologies: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
      <Field label="GitHub URL">
        <input className={INPUT_CLASS} value={row.githubUrl || ''} onChange={(e) => onChange({ ...row, githubUrl: e.target.value })} placeholder="https://" />
      </Field>
      <Field label={ja ? 'デモ URL' : 'Live demo URL'}>
        <input className={INPUT_CLASS} value={row.liveDemoUrl || ''} onChange={(e) => onChange({ ...row, liveDemoUrl: e.target.value })} placeholder="https://" />
      </Field>
      <Field label={ja ? '開始' : 'Start'}>
        <input className={INPUT_CLASS} value={row.startDate || ''} onChange={(e) => onChange({ ...row, startDate: e.target.value })} />
      </Field>
      <Field label={ja ? '終了' : 'End'}>
        <input className={INPUT_CLASS} value={row.endDate || ''} onChange={(e) => onChange({ ...row, endDate: e.target.value })} />
      </Field>
      <div className="md:col-span-2">
        <Field label={ja ? '概要' : 'Description'}>
          <textarea className={TEXTAREA_CLASS} value={row.description || ''} onChange={(e) => onChange({ ...row, description: e.target.value })} />
        </Field>
      </div>
      <Field label={ja ? '主な機能' : 'Key features'}>
        <textarea className={TEXTAREA_CLASS} value={row.keyFeatures || ''} onChange={(e) => onChange({ ...row, keyFeatures: e.target.value })} />
      </Field>
      <Field label={ja ? '技術的課題' : 'Technical challenges'}>
        <textarea className={TEXTAREA_CLASS} value={row.technicalChallenges || ''} onChange={(e) => onChange({ ...row, technicalChallenges: e.target.value })} />
      </Field>
      <Field label={ja ? '解決策' : 'Solutions'}>
        <textarea className={TEXTAREA_CLASS} value={row.solutions || ''} onChange={(e) => onChange({ ...row, solutions: e.target.value })} />
      </Field>
      <Field label={ja ? '成果' : 'Achievements'}>
        <textarea className={TEXTAREA_CLASS} value={row.achievements || ''} onChange={(e) => onChange({ ...row, achievements: e.target.value })} />
      </Field>
    </div>
  );
}

function CertCard({
  row,
  ja,
  onChange,
  onDelete,
}: {
  row: CertificationEntry;
  ja: boolean;
  onChange: (row: CertificationEntry) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={ja ? '資格名' : 'Name'}>
          <input className={INPUT_CLASS} value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} />
        </Field>
        <Field label={ja ? '発行団体' : 'Issuing organization'}>
          <input className={INPUT_CLASS} value={row.issuingOrganization || ''} onChange={(e) => onChange({ ...row, issuingOrganization: e.target.value })} />
        </Field>
        <Field label={ja ? '取得日' : 'Date obtained'}>
          <input className={INPUT_CLASS} value={row.dateObtained || ''} onChange={(e) => onChange({ ...row, dateObtained: e.target.value })} />
        </Field>
        <Field label={ja ? '有効期限' : 'Expiration'}>
          <input className={INPUT_CLASS} value={row.expirationDate || ''} onChange={(e) => onChange({ ...row, expirationDate: e.target.value })} />
        </Field>
        <Field label={ja ? '状態' : 'Status'}>
          <select className={INPUT_CLASS} value={row.status || 'Obtained'} onChange={(e) => onChange({ ...row, status: e.target.value })}>
            {CERT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label={ja ? '証明書 URL' : 'Credential URL'}>
          <input className={INPUT_CLASS} value={row.credentialUrl || ''} onChange={(e) => onChange({ ...row, credentialUrl: e.target.value })} placeholder="https://" />
        </Field>
      </div>
      <NeonButton size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete}>
        {ja ? '削除' : 'Delete'}
      </NeonButton>
    </div>
  );
}
