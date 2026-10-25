import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { FuturisticInput } from '../components/common/FuturisticInput';
import { NeonButton } from '../components/common/NeonButton';
import {
  Building2,
  Briefcase,
  Layers,
  Globe2,
  Mic,
  Cpu,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Clock,
  Zap,
  Upload,
} from 'lucide-react';
import {
  InterviewType,
  InterviewDifficulty,
  InterviewMode,
  InterviewLanguage,
} from '../types/interview';
import { AiProfile } from '../types/aiProfile';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import { resolveLanguage, resolveInterviewLanguage } from '../utils/languageResolver';
import { authApi } from '../services/httpClient';
import { careerCenterClient } from '../services/careerCenterClient';
import type { CompanyAnalysis } from '../types/careerCenter';

export const InterviewSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    interviewConfig,
    setInterviewConfig,
    selectedLanguage,
    uiLocale,
    uiLanguage,
    addToast,
    aiProfiles,
    preferredAiProfile,
    selectedAiMode,
    setSelectedAiMode,
    user,
  } = useApp();

  const langRes = resolveLanguage(selectedLanguage);

  const [companyName, setCompanyName] = useState(interviewConfig.companyName || 'LINEヤフー株式会社 (LY Corporation)');
  const [jobPosition, setJobPosition] = useState(interviewConfig.jobPosition || 'Software Engineer (Backend)');
  const [industry, setIndustry] = useState(interviewConfig.industry || 'IT / Webサービス');
  const [jobDescription, setJobDescription] = useState(
    interviewConfig.jobDescription || 'Java / Go / 分散システム開発およびAPI設計'
  );
  const [interviewType, setInterviewType] = useState<InterviewType>(interviewConfig.type || 'technical');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(interviewConfig.difficulty || 'intermediate');
  const [mode, setMode] = useState<InterviewMode>(interviewConfig.mode || 'manual');
  const [language, setLanguage] = useState<InterviewLanguage>(
    interviewConfig.language || resolveInterviewLanguage(selectedLanguage)
  );
  const [questionCount, setQuestionCount] = useState<number>(interviewConfig.questionCount || 5);
  const [selectedProfile, setSelectedProfile] = useState<AiProfile>(interviewConfig.aiProfile || preferredAiProfile);

  // CV Documents state
  const [userCvs, setUserCvs] = useState<any[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('default');
  const [loadingCvs, setLoadingCvs] = useState(false);
  const [companyAnalyses, setCompanyAnalyses] = useState<CompanyAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>(
    interviewConfig.companyAnalysisId || ''
  );

  useEffect(() => {
    let isMounted = true;
    async function fetchUserCvs() {
      setLoadingCvs(true);
      try {
        const docs = await authApi.getCvDocuments();
        if (isMounted && Array.isArray(docs)) {
          setUserCvs(docs);
          if (interviewConfig.cvDocumentId) {
            setSelectedCvId(String(interviewConfig.cvDocumentId));
          } else if (docs.length > 0 && !interviewConfig.cvFileName) {
            setSelectedCvId(String(docs[0].id));
          } else if (interviewConfig.cvFileName) {
            const found = docs.find((d: any) => d.filename === interviewConfig.cvFileName);
            if (found) {
              setSelectedCvId(String(found.id));
            }
          }
        }
      } catch {
        // Fallback to default candidate profile gracefully
      } finally {
        if (isMounted) setLoadingCvs(false);
      }
    }
    async function fetchAnalyses() {
      try {
        const list = await careerCenterClient.listCompanyAnalyses();
        if (isMounted) setCompanyAnalyses(Array.isArray(list) ? list : []);
      } catch {
        // optional
      }
    }
    void fetchUserCvs();
    void fetchAnalyses();
    return () => {
      isMounted = false;
    };
  }, [interviewConfig.cvFileName, interviewConfig.cvDocumentId]);

  const getEstimatedDuration = (count: number) => {
    if (count === 5) return '~10 min';
    if (count === 10) return '~20 min';
    return '~30 min';
  };

  const getSelectedCvLabel = () => {
    if (selectedCvId === 'default') {
      return user?.cvFileName ? `${user.cvFileName} (Active Profile)` : 'Standard Candidate Profile (Java / Spring)';
    }
    const found = userCvs.find((c) => String(c.id) === selectedCvId);
    return found ? found.filename : (interviewConfig.cvFileName || 'Default Profile');
  };

  const handleStart = () => {
    if (!companyName.trim()) {
      addToast('Please enter a company name.', 'warning');
      return;
    }
    if (!jobPosition.trim()) {
      addToast('Please enter a job position.', 'warning');
      return;
    }

    const resolvedLang = resolveInterviewLanguage(selectedLanguage);
    const chosenCv = userCvs.find((c) => String(c.id) === selectedCvId);
    const cvName = chosenCv ? chosenCv.filename : (user?.cvFileName || interviewConfig.cvFileName || 'Default_Candidate_Profile.pdf');
    const cvDocumentId =
      selectedCvId !== 'default' && Number.isFinite(Number(selectedCvId))
        ? Number(selectedCvId)
        : undefined;
    const analysis = companyAnalyses.find((a) => a.id === selectedAnalysisId);

    setInterviewConfig((prev) => ({
      ...prev,
      companyName: analysis?.companyName || companyName,
      jobPosition,
      industry,
      jobDescription,
      type: selectedAnalysisId ? 'company-specific' : interviewType,
      difficulty,
      mode,
      language: resolvedLang,
      questionCount,
      aiProfile: selectedProfile,
      cvFileName: cvName,
      cvDocumentId,
      companyAnalysisId: selectedAnalysisId || undefined,
      jobId: prev.jobId,
    }));

    addToast(
      uiLocale === 'ja' ? 'AI面接ルームを初期化中...' : 'Initializing AI Interview Room...',
      'info'
    );

    navigate('/career/interview/room');
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 select-none py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {uiLanguage === 'ja' ? '面接シミュレーター設定' : 'AI Interview Setup'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {uiLanguage === 'ja'
              ? '志望先企業と職種、難易度や面接形式をカスタマイズして、本番さながらのAI模擬面接を開始します。'
              : 'Customize company details, difficulty, mode, and questions for realistic Japanese interview practice.'}
          </p>
        </div>

        <NeonButton
          size="lg"
          onClick={handleStart}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          {uiLanguage === 'ja' ? '面接を開始する' : 'START INTERVIEW'}
        </NeonButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 6: Company Information Card */}
          <GlassCard className="p-6 md:p-7 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-50">
              <Building2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-800">
                {uiLanguage === 'ja' ? '1. 企業情報・志望ポジション' : '1. Company & Role Target'}
              </h2>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {uiLanguage === 'ja' ? '企業分析（任意）' : 'Company analysis (optional)'}
              </span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                value={selectedAnalysisId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedAnalysisId(id);
                  const found = companyAnalyses.find((a) => a.id === id);
                  if (found?.companyName) setCompanyName(found.companyName);
                  if (id) setInterviewType('company-specific');
                }}
              >
                <option value="">
                  {uiLanguage === 'ja' ? 'なし（通常面接）' : 'None (standard interview)'}
                </option>
                {companyAnalyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.companyName || a.id) + (a.status ? ` · ${a.status}` : '')}
                  </option>
                ))}
              </select>
              <Link to="/career/company-analysis" className="text-xs font-semibold text-indigo-600 hover:underline">
                {uiLanguage === 'ja' ? '企業分析を作成する' : 'Create company analysis'}
              </Link>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FuturisticInput
                label={uiLanguage === 'ja' ? '会社名 / 企業名' : 'Company Name'}
                placeholder="e.g. LINEヤフー株式会社, Mercari, Sony"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                icon={<Building2 className="w-4 h-4" />}
              />

              <FuturisticInput
                label={uiLanguage === 'ja' ? '希望職種 / ポジション' : 'Job Position'}
                placeholder="e.g. Backend Engineer, Frontend Dev"
                value={jobPosition}
                onChange={(e) => setJobPosition(e.target.value)}
                icon={<Briefcase className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FuturisticInput
                label={uiLanguage === 'ja' ? '業界 / カテゴリ' : 'Industry'}
                placeholder="e.g. IT / Web, FinTech, E-Commerce"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                icon={<Layers className="w-4 h-4" />}
              />

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                  {uiLocale === 'ja' ? '面接言語' : 'Interview Language'}
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
                  <div className="flex items-center gap-2.5">
                    <Globe2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span>{langRes.nativeName}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({langRes.label})</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {uiLocale === 'ja'
                          ? 'トップバーのグローバル言語設定と連動中'
                          : 'Synchronized with top-bar global language selector'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                    Global
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                {uiLanguage === 'ja' ? '募集要項 / 主な業務内容' : 'Job Description / Tech Stack'}
              </label>
              <textarea
                rows={2}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="e.g. Java 17, Spring Boot, PostgreSQL, AWS, High-concurrency transaction design"
                className="w-full rounded-xl bg-white/95 border border-[#E2EEF8] p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#008CFF] focus:ring-2 focus:ring-[#008CFF]/20 outline-none transition-all"
              />
            </div>
          </GlassCard>

          {/* Phase 7: Interview Configuration Card */}
          <GlassCard className="p-6 md:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-50">
              <Cpu className="w-5 h-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-800">
                {uiLanguage === 'ja' ? '2. 面接形式・難易度・モード' : '2. Format, Difficulty & Mode'}
              </h2>
            </div>

            {/* Interview Type Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                {uiLanguage === 'ja' ? '面接タイプ' : 'Interview Type'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'general', title: '一般面接', en: 'General' },
                  { id: 'technical', title: '技術面接', en: 'Technical' },
                  { id: 'company-specific', title: '企業特化', en: 'Company-specific' },
                  { id: 'hr', title: '人事面接', en: 'HR / Culture' },
                  { id: 'behavioral', title: '行動面接', en: 'Behavioral' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInterviewType(t.id as InterviewType)}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      interviewType === t.id
                        ? 'bg-blue-500/10 border-blue-500 text-blue-700 shadow-sm'
                        : 'bg-white border-[#E2EEF8] text-slate-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.en}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty & Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Difficulty */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                  {uiLanguage === 'ja' ? '難易度' : 'Difficulty Level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'beginner', label: '初級', en: 'Beginner' },
                    { id: 'intermediate', label: '中級', en: 'Interm.' },
                    { id: 'advanced', label: '上級', en: 'Advanced' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id as InterviewDifficulty)}
                      className={`py-2 px-2 rounded-xl text-center border transition-all ${
                        difficulty === d.id
                          ? 'bg-blue-500/10 border-blue-500 text-blue-700 font-bold shadow-2xs'
                          : 'bg-white border-[#E2EEF8] text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs">{d.label}</div>
                      <div className="text-[9px] text-slate-400">{d.en}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                  {uiLanguage === 'ja' ? '面接モード' : 'Interview Mode'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      mode === 'manual'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-800 shadow-2xs'
                        : 'bg-white border-[#E2EEF8] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Manual Mode</div>
                    <div className="text-[10px] text-slate-400">マニュアル録音</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      mode === 'auto'
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-800 shadow-2xs'
                        : 'bg-white border-[#E2EEF8] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Auto Mode</div>
                    <div className="text-[10px] text-slate-400">音声自動検知</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Question count selector with explicit duration breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {uiLanguage === 'ja' ? '質問数 & 想定所要時間' : 'Question Count & Duration Breakdown'}
                </label>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                  <Clock className="w-3.5 h-3.5" />
                  {uiLanguage === 'ja' ? `目安: ${getEstimatedDuration(questionCount)}` : `Est: ${getEstimatedDuration(questionCount)}`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { cnt: 5, time: '~10m', labelJa: 'スピード演習', labelEn: 'Quick Drill' },
                  { cnt: 10, time: '~20m', labelJa: '標準模擬面接', labelEn: 'Standard Round' },
                  { cnt: 15, time: '~30m', labelJa: '徹底本番演習', labelEn: 'In-Depth Full' },
                ].map((item) => (
                  <button
                    key={item.cnt}
                    type="button"
                    onClick={() => setQuestionCount(item.cnt)}
                    className={`py-3 px-3 rounded-2xl text-left border transition-all ${
                      questionCount === item.cnt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                        : 'bg-white border-[#E2EEF8] text-slate-700 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{item.cnt} Questions</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${questionCount === item.cnt ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {item.time}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-1 ${questionCount === item.cnt ? 'text-blue-100' : 'text-slate-400'}`}>
                      {uiLanguage === 'ja' ? item.labelJa : item.labelEn}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* CV Selection Card */}
          <GlassCard className="p-6 md:p-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-blue-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-slate-800">
                  {uiLanguage === 'ja' ? '3. 連携CV / 職務経歴書' : '3. Linked Candidate CV Profile'}
                </h2>
              </div>
              <Link
                to="/career/cv"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uiLanguage === 'ja' ? '履歴書を管理' : 'Manage CVs'}</span>
              </Link>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                {uiLanguage === 'ja' ? '面接に連携する履歴書を選択' : 'Select CV for Question Personalization'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Default candidate profile option */}
                <div
                  onClick={() => setSelectedCvId('default')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedCvId === 'default'
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {user?.cvFileName ? user.cvFileName : 'Standard Candidate CV'}
                      </span>
                    </div>
                    {selectedCvId === 'default' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Java 17, Spring Boot, Microservices, JLPT N2 profile
                  </p>
                </div>

                {/* Uploaded CV documents */}
                {userCvs.map((cvDoc) => (
                  <div
                    key={cvDoc.id}
                    onClick={() => setSelectedCvId(String(cvDoc.id))}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedCvId === String(cvDoc.id)
                        ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {cvDoc.filename}
                        </span>
                      </div>
                      {selectedCvId === String(cvDoc.id) && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {cvDoc.sizeBytes ? `${(cvDoc.sizeBytes / 1024 / 1024).toFixed(2)} MB • ` : ''}
                      {cvDoc.status || 'Verified'}
                    </p>
                  </div>
                ))}
              </div>

              {loadingCvs && (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading candidate CV records...</span>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Col: Summary Card & Session Readiness */}
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-5">
            <h3 className="font-display font-bold text-base text-slate-900 border-b border-blue-50 pb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              {uiLanguage === 'ja' ? 'セッション構成サマリー' : 'Interview Summary'}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Target Company:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[150px]">
                  {companyName}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Target Role:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[150px]">
                  {jobPosition}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Interview Type:</span>
                <span className="font-semibold text-blue-600 uppercase tracking-wide">
                  {interviewType}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Difficulty:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {difficulty}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Questions & Time:</span>
                <span className="font-bold text-slate-900">
                  {questionCount} Qs ({getEstimatedDuration(questionCount)})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Control Mode:</span>
                <span className="font-semibold text-cyan-600 uppercase">
                  {mode}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Active CV:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1 truncate max-w-[150px]" title={getSelectedCvLabel()}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{getSelectedCvLabel()}</span>
                </span>
              </div>
            </div>

            {/* AI Model Selector directly near Start Interview CTA */}
            <div className="pt-3 pb-1 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                  {uiLanguage === 'ja' ? 'AIインテリジェンス' : 'AI Intelligence'}
                </label>
                <div className="text-[10px] text-slate-400">
                  Mode: <span className="font-bold text-blue-600">{selectedAiMode}</span>
                </div>
              </div>
              <AiProfileSelector
                selectedProfile={selectedProfile}
                onChange={setSelectedProfile}
                locked={false}
                availableProfiles={aiProfiles}
                placement="top"
              />
            </div>

            {/* Launch CTA */}
            <NeonButton
              size="lg"
              onClick={handleStart}
              className="w-full shadow-lg shadow-blue-500/30"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {uiLanguage === 'ja' ? '面接を開始する' : 'START INTERVIEW'}
            </NeonButton>
          </GlassCard>

          {/* Tips card */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/80 text-slate-600 text-xs space-y-2">
            <div className="font-bold text-blue-800 flex items-center gap-1.5">
              <span>💡</span>
              <span>Japanese Interview Tip:</span>
            </div>
            <p className="leading-relaxed">
              In Japanese interviews, clearly state your conclusion first (結論ファースト) followed by the STAR reason and concrete results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

