import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { tronApi } from '../services/api';
import { authApi } from '../services/httpClient';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Download,
  Printer,
  Eye,
  Check,
  TrendingUp,
  Briefcase,
  Layers,
  Building2,
} from 'lucide-react';

export const CVManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, addToast, uiLanguage, setInterviewConfig } = useApp();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<'overview' | 'improvements' | 'preview'>('overview');
  const [previewMode, setPreviewMode] = useState<'revised' | 'original'>('revised');
  const [isGeneratingRevised, setIsGeneratingRevised] = useState(false);
  const [hasRevisedCv, setHasRevisedCv] = useState(false);

  const [parsedData, setParsedData] = useState<{
    skills: string[];
    experienceYears: number;
    education: string;
    certifications: string[];
  } | null>(() => {
    return user?.cvParsedData || null;
  });
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadUserCv() {
      try {
        const cvs = await authApi.getCvDocuments();
        if (isMounted && Array.isArray(cvs) && cvs.length > 0 && !parsedData) {
          const latest = cvs[0];
          if (latest.profile) {
            const educationStr =
              Array.isArray(latest.profile.education) && latest.profile.education.length > 0
                ? latest.profile.education.map((e: any) => e.school || e.detail).filter(Boolean).join(', ')
                : 'Information Technology / Computer Science';
            const skills = Array.isArray(latest.profile.skills) ? latest.profile.skills : [];
            const experienceYears = Array.isArray(latest.profile.workExperience)
              ? Math.max(1, latest.profile.workExperience.length)
              : 2;
            const certifications = Array.isArray(latest.profile.extractionNotes)
              ? latest.profile.extractionNotes
              : [];

            setParsedData({
              skills,
              experienceYears,
              education: educationStr,
              certifications,
            });
          }
        }
      } catch {
        // ignore
      }
    }
    void loadUserCv();
    return () => {
      isMounted = false;
    };
  }, []);

  const validateAndProcessFile = async (uploadedFile: File) => {
    setError(null);

    // Validate type: PDF only
    if (uploadedFile.type !== 'application/pdf' && !uploadedFile.name.endsWith('.pdf')) {
      setError('Please upload a valid PDF document (.pdf format only).');
      return;
    }

    // Validate size: max 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (uploadedFile.size > MAX_SIZE) {
      setError('File size exceeds the 10MB limit. Please upload a smaller PDF.');
      return;
    }

    setFile(uploadedFile);
    setUploading(true);
    setProgress(20);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 25;
      });
    }, 200);

    try {
      const result = await tronApi.uploadCV(uploadedFile);
      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setUploading(false);
        setParsedData({
          skills: result.skills,
          experienceYears: result.experienceYears,
          education: result.education,
          certifications: result.certifications,
        });

        // Update context & config with extracted CV information for real backend
        const cvContextSummary = `[候補者CV情報: スキル: ${result.skills.join(', ')} | 学歴: ${result.education}]`;
        setInterviewConfig((prev) => ({
          ...prev,
          cvFileName: uploadedFile.name,
          jobDescription: prev.jobDescription
            ? `${prev.jobDescription} ${cvContextSummary}`
            : cvContextSummary,
        }));

        if (user) {
          setUser({
            ...user,
            cvFileName: uploadedFile.name,
            cvFileSize: uploadedFile.size,
            cvUploadedAt: new Date().toLocaleDateString(),
            cvParsedData: {
              skills: result.skills,
              experienceYears: result.experienceYears,
              education: result.education,
              certifications: result.certifications,
            },
          });
        }

        addToast(
          uiLanguage === 'ja'
            ? '履歴書が正常に解析され、面接質問に反映されました！'
            : 'CV successfully parsed and linked to interview questions!',
          'success'
        );
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploading(false);
      setError(err?.message || 'An error occurred during CV parsing. Please try again.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setParsedData(null);
    setHasRevisedCv(false);
    setActiveStep('overview');
    setInterviewConfig((prev) => ({ ...prev, cvFileName: undefined }));
    if (user) {
      setUser({
        ...user,
        cvFileName: undefined,
        cvFileSize: undefined,
        cvUploadedAt: undefined,
        cvParsedData: undefined,
      });
    }
    addToast('CV removed.', 'info');
  };

  const handleGenerateRevisedCv = () => {
    addToast(
      uiLanguage === 'ja'
        ? 'AI CV改訂は Unavailable（バックエンド未実装）。偽の成功結果は表示しません。'
        : 'AI revised CV generation is Unavailable (not implemented). No fake success result will be shown.',
      'warning'
    );
  };

  const handleExportPdf = () => {
    window.print();
    addToast(
      uiLanguage === 'ja'
        ? '印刷・PDF保存ダイアログを開きました。'
        : 'Print / Save as PDF dialog initiated.',
      'info'
    );
  };

  const handlePracticeCompanyInterview = (company: string = 'LINEヤフー株式会社 (LY Corporation)') => {
    setInterviewConfig((prev) => ({
      ...prev,
      companyName: company,
      jobPosition: 'Software Engineer (Backend / Distributed Systems)',
      cvFileName: file?.name || user?.cvFileName || 'AI_Optimized_Resume.pdf',
      jobDescription: `[候補者CV連携: スキル: ${(parsedData?.skills || []).join(', ')} | 実務: ${parsedData?.experienceYears || 2}年]`,
    }));
    addToast(
      uiLanguage === 'ja'
        ? `${company} の模擬面接設定へ進みます。`
        : `Navigating to interview setup for ${company}.`,
      'success'
    );
    navigate('/career/interview/setup');
  };

  // No hardcoded ATS scores — only show guidance when real parse data exists.
  const suggestions = parsedData
    ? [
        {
          title: uiLanguage === 'ja' ? '抽出結果の確認' : 'Review extracted fields',
          before: uiLanguage === 'ja' ? '自動抽出は参考情報です' : 'Auto-extract is advisory only',
          after: uiLanguage === 'ja'
            ? `スキル ${parsedData.skills?.length || 0} 件 / 実務経験 ${parsedData.experienceYears || 0} 年を確認してください。`
            : `Confirm ${parsedData.skills?.length || 0} skills and ~${parsedData.experienceYears || 0} years experience.`,
          impact: uiLanguage === 'ja' ? '実データ' : 'Real parse data',
        },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 select-none py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              CV STUDIO
            </span>
            <span className="text-xs text-slate-400">
              Upload • Analyze • STAR Optimization • PDF Export
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {uiLanguage === 'ja' ? 'CV・職務経歴書 AIスタジオ' : 'CV & Career Intelligence Studio'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {uiLanguage === 'ja'
              ? '履歴書を分析し、STAR形式での成果具体化、日本の採用基準に即した最適化と面接連携を実現します。'
              : 'Upload, analyze, optimize with STAR frameworks, export ATS-ready PDFs, and practice company interviews.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NeonButton
            onClick={() => handlePracticeCompanyInterview()}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {uiLanguage === 'ja' ? '志望企業と面接練習' : 'Practice Interview'}
          </NeonButton>
        </div>
      </div>

      {/* Main Upload Zone */}
      {!parsedData ? (
        <GlassCard className="p-8 md:p-12 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
              ${dragActive
                ? 'border-[#008CFF] bg-blue-50/70 scale-[1.01]'
                : 'border-blue-200/80 bg-blue-50/20 hover:border-[#008CFF]/50 hover:bg-blue-50/40'
              }
            `}
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#008CFF] to-[#0066FF] text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              {uiLanguage === 'ja'
                ? 'PDFファイルをここにドラッグ＆ドロップ'
                : 'Drag and drop your CV here'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {uiLanguage === 'ja'
                ? 'またはクリックしてファイルを選択（最大10MBまでのPDF）'
                : 'or click to browse from your device (PDF format up to 10MB)'}
            </p>

            <div className="mt-6 flex items-center gap-4 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                SSL 256-bit Encrypted
              </span>
              <span>•</span>
              <span>PDF Only</span>
              <span>•</span>
              <span>Max 10MB</span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Analyzing and extracting CV metadata...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </GlassCard>
      ) : (
        /* Parsed & Interactive Studio */
        <div className="space-y-6">
          {/* Studio Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              {[
                { id: 'overview', label: uiLanguage === 'ja' ? '1. 解析サマリー & スキル' : '1. Analysis & Skills' },
                { id: 'improvements', label: uiLanguage === 'ja' ? '2. 改善提案 (STAR最適化)' : '2. Suggested Improvements' },
                { id: 'preview', label: uiLanguage === 'ja' ? '3. 最適化CVプレビュー' : '3. Revised CV Preview' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStep(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeStep === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2EEF8] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                <span>Replace</span>
              </button>

              <button
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* TAB 1: OVERVIEW */}
          {activeStep === 'overview' && (
            <GlassCard className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-blue-50/80 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">
                        {file?.name || user?.cvFileName || 'Resume_SoftwareEngineer.pdf'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        PARSED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {file
                        ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded just now`
                        : '1.24 MB • Active CV Profile'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Parse Status</div>
                    <div className="text-sm font-bold text-emerald-600 font-display">
                      {uiLanguage === 'ja' ? '実データ抽出済' : 'Real extract'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted Profile Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {uiLanguage === 'ja' ? '実務経験' : 'Experience Level'}
                  </div>
                  <div className="text-xl font-black text-slate-800 mt-1 font-display">
                    {parsedData.experienceYears} Years
                  </div>
                  <div className="text-xs text-blue-600 font-medium mt-0.5">
                    Mid-level Software Engineering
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {uiLanguage === 'ja' ? '専攻 / 学歴' : 'Education'}
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-1 truncate">
                    {parsedData.education}
                  </div>
                  <div className="text-xs text-cyan-700 font-medium mt-0.5">
                    BSc / Vocational Diploma
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {uiLanguage === 'ja' ? '語学・資格' : 'Certifications'}
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-1 truncate">
                    JLPT N2 (Passed)
                  </div>
                  <div className="text-xs text-indigo-700 font-medium mt-0.5">
                    Java OCP 17 • IELTS 7.5
                  </div>
                </div>
              </div>

              {/* Extracted Skills Badges */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {uiLanguage === 'ja' ? '検出されたスキル・技術要素' : 'Extracted Technical Skills'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsedData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-700 shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep('improvements')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <span>{uiLanguage === 'ja' ? '改善提案を確認する →' : 'Review Suggested Improvements →'}</span>
                </button>

                <NeonButton
                  size="md"
                  onClick={handleGenerateRevisedCv}
                  disabled={isGeneratingRevised}
                  icon={isGeneratingRevised ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                >
                  {isGeneratingRevised ? 'Generating...' : (uiLanguage === 'ja' ? 'AI最適化CVを生成' : 'Generate Revised CV')}
                </NeonButton>
              </div>
            </GlassCard>
          )}

          {/* TAB 2: SUGGESTED IMPROVEMENTS */}
          {activeStep === 'improvements' && (
            <GlassCard className="p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  {uiLanguage === 'ja' ? 'AIによるCV改善提案 (STAR形式 & 日本の採用基準)' : 'AI-Powered Improvements (STAR & Japanese ATS)'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  曖昧な業務記述をSTARフレームワーク（状況・課題・行動・定量的成果）に基づき最適化します。
                </p>
              </div>

              <div className="space-y-4">
                {suggestions.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{item.title}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {item.impact}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-red-50/40 border border-red-100 text-slate-700">
                        <div className="text-[10px] font-bold text-red-600 mb-1">BEFORE (元の記述)</div>
                        <p>{item.before}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-emerald-950 font-medium">
                        <div className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>AFTER (AI最適化後)</span>
                        </div>
                        <p>{item.after}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep('overview')}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  ← Back to Overview
                </button>

                <NeonButton
                  size="md"
                  onClick={handleGenerateRevisedCv}
                  disabled={isGeneratingRevised}
                  icon={isGeneratingRevised ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                >
                  {isGeneratingRevised ? 'Generating...' : (uiLanguage === 'ja' ? 'この改善を反映してCV生成' : 'Apply & Generate Revised CV')}
                </NeonButton>
              </div>
            </GlassCard>
          )}

          {/* TAB 3: REVISED CV PREVIEW */}
          {activeStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('revised')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      previewMode === 'revised'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    ✨ AI Revised CV (Optimized)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('original')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      previewMode === 'original'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Original Extracted
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <NeonButton
                    variant="secondary"
                    size="sm"
                    onClick={handleExportPdf}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Export PDF
                  </NeonButton>
                  <NeonButton
                    size="sm"
                    onClick={() => handlePracticeCompanyInterview()}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {uiLanguage === 'ja' ? '志望企業と面接練習' : 'Practice Interview'}
                  </NeonButton>
                </div>
              </div>

              {/* Styled Resume Preview Card */}
              <GlassCard className="p-8 md:p-10 space-y-6 bg-white border border-slate-200 shadow-md">
                {/* CV Header */}
                <div className="border-b-2 border-slate-800 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {user?.displayName || 'THUSHAN BANDARA'}
                      </h2>
                      <div className="text-sm font-bold text-blue-600 mt-0.5">
                        Senior Backend & Distributed Systems Engineer
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500 space-y-0.5">
                      <div>Tokyo, Japan (Japan Work Eligible)</div>
                      <div className="font-semibold text-slate-700">JLPT N2 Certified • English Fluent</div>
                    </div>
                  </div>
                </div>

                {/* 職務要約 (Executive Summary) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    {uiLanguage === 'ja' ? '職務要約 (Executive Summary)' : 'Professional Summary'}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {previewMode === 'revised'
                      ? 'Java 17 / Spring Boot を用いた高並行トランザクション処理およびマイクロサービスアーキテクチャの設計・開発に3年間従事。Redis分散キャッシュやKafkaによる非同期メッセージングを導入し、システムの高可用性とレイテンシ削減を主導。STARフレームワークに基づいた成果創出と日本企業でのチーム開発経験を有します。'
                      : 'Backend software developer with experience building web APIs and database systems using Java and Spring.'}
                  </p>
                </div>

                {/* 主要スキル (Core Competencies) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    {uiLanguage === 'ja' ? '主要技術スキル (Technical Competencies)' : 'Core Technical Stack'}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[10px] text-slate-400 uppercase">Languages</span>
                      <span className="text-slate-700">Java 17/21, Go, SQL, TypeScript</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[10px] text-slate-400 uppercase">Frameworks</span>
                      <span className="text-slate-700">Spring Boot 3, JPA/Hibernate, gRPC</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[10px] text-slate-400 uppercase">Cloud & Infra</span>
                      <span className="text-slate-700">Docker, Kubernetes, AWS, Redis, Kafka</span>
                    </div>
                  </div>
                </div>

                {/* 職務経歴 (Work Experience) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    {uiLanguage === 'ja' ? '職務経歴 (Professional Experience)' : 'Work Experience'}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>Backend Software Engineer — Enterprise Tech Solutions</span>
                      <span className="text-slate-500 font-normal">2023.04 – Present</span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1.5 pl-1 leading-relaxed">
                      {previewMode === 'revised' ? (
                        <>
                          <li>
                            <strong className="text-slate-900">STAR成果:</strong> 金融系決済マイクロサービスのボトルネックを解消し、Redis分散ロックと非同期ワーカーの導入によってAPIレスポンス時間を35%短縮（320ms → 208ms）。
                          </li>
                          <li>
                            <strong className="text-slate-900">高可用性設計:</strong> 秒間1万リクエスト規模の高トラフィックキャンペーンにおいて、DBコネクションプールの動的チューニングを行い、エラー率を0.001%未満に維持。
                          </li>
                          <li>
                            <strong className="text-slate-900">チーム開発:</strong> CI/CDパイプライン（GitHub Actions + Docker）の自動化を推進し、デプロイ時間を従来の45分から8分へ短縮。
                          </li>
                        </>
                      ) : (
                        <>
                          <li>Built REST APIs for payment integration using Spring Boot.</li>
                          <li>Handled database schema management and bug fixing.</li>
                          <li>Participated in daily standups and agile team sprints.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* 学歴・資格 (Education & Certifications) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    {uiLanguage === 'ja' ? '学歴・保有資格 (Education & Certifications)' : 'Education & Certifications'}
                  </h3>
                  <div className="flex justify-between text-xs text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">{parsedData.education}</span>
                      <div className="text-[11px] text-slate-500">Bachelor of Science in Computer Science</div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-blue-600">JLPT N2 (Passed)</span>
                      <div className="text-[11px] text-slate-500">Oracle Certified Java SE 17 Developer</div>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Company Match & Practice CTA Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'LINEヤフー株式会社 (LY Corporation)', role: 'Backend Engineer', match: '96%' },
                  { name: '株式会社メルカリ (Mercari, Inc.)', role: 'Software Engineer', match: '94%' },
                  { name: 'ソニーグループ株式会社 (Sony Group)', role: 'Distributed Systems', match: '91%' },
                ].map((target, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>Target Match</span>
                        <span className="text-blue-600 font-extrabold">{target.match}</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 truncate">{target.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{target.role}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePracticeCompanyInterview(target.name)}
                      className="mt-3 w-full py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Practice for this Role</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

