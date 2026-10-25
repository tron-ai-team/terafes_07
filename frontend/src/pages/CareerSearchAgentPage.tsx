import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import { CareerJobCard } from '../components/career/CareerJobCard';
import { CareerJobDetailsDrawer } from '../components/career/CareerJobDetailsDrawer';
import { CareerAgentTrace } from '../components/career/CareerAgentTrace';
import { careerAgentClient } from '../services/careerAgentClient';
import { authApi } from '../services/httpClient';
import {
  CareerJobResult,
  CareerAgentStep,
  CareerAgentMetrics,
} from '../types/careerAgent';
import { AiProfile } from '../types/aiProfile';
import {
  DEMO_CAREER_RESULTS,
  DEMO_CAREER_STEPS,
  DEMO_CAREER_METRICS,
} from '../data/demoCareerResults';
import {
  Search,
  Bot,
  Globe,
  Briefcase,
  MapPin,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Layers,
  Filter,
} from 'lucide-react';

const INITIAL_STEPS: CareerAgentStep[] = [
  { step: 1, title: 'Reading candidate profile', status: 'pending' },
  { step: 2, title: 'Opening target website', status: 'pending' },
  { step: 3, title: 'Discovering job postings', status: 'pending' },
  { step: 4, title: 'Reading job requirements', status: 'pending' },
  { step: 5, title: 'Removing duplicates', status: 'pending' },
  { step: 6, title: 'Matching jobs to candidate', status: 'pending' },
  { step: 7, title: 'Ranking opportunities', status: 'pending' },
];

import { resolveLanguage } from '../utils/languageResolver';

export const CareerSearchAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, addToast, selectedLanguage, uiLanguage, aiProfiles, preferredAiProfile } = useApp();

  const langDef = resolveLanguage(selectedLanguage);

  // Core Form State
  const [websiteUrl, setWebsiteUrl] = useState('https://www.lycorp.co.jp/ja/careers/jobs');
  const [targetRole, setTargetRole] = useState('Backend Engineer');
  const [location, setLocation] = useState('Tokyo');
  const [keywords, setKeywords] = useState('Java, Spring Boot, SQL, REST API');
  const [minimumMatch, setMinimumMatch] = useState<number>(70);
  const [maxResults, setMaxResults] = useState<number>(10);
  const [selectedCvId, setSelectedCvId] = useState<number | undefined>(undefined);
  const [selectedProfile, setSelectedProfile] = useState<AiProfile>(preferredAiProfile);

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [employmentType, setEmploymentType] = useState('any');
  const [newGraduateOnly, setNewGraduateOnly] = useState(false);
  const [japaneseLevel, setJapaneseLevel] = useState('any');

  // Available user CVs
  const [userCvs, setUserCvs] = useState<Array<{ id: number; filename: string }>>([]);

  // Execution & Results State
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<CareerAgentStep[]>(INITIAL_STEPS);
  const [results, setResults] = useState<CareerJobResult[]>([]);
  const [metrics, setMetrics] = useState<CareerAgentMetrics | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);

  // Drawer & Filter Toolbar State
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<CareerJobResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'newgrad' | 'tokyo' | 'remote'>('all');
  const [sortBy, setSortBy] = useState<'match' | 'company' | 'location'>('match');

  // Load user CVs on mount
  useEffect(() => {
    loadUserCvs();
  }, []);

  const loadUserCvs = async () => {
    try {
      const cvs = await authApi.getCvDocuments();
      if (Array.isArray(cvs) && cvs.length > 0) {
        setUserCvs(cvs);
        setSelectedCvId(cvs[0].id);
      }
    } catch {
      // Non-critical if no CVs yet
    }
  };

  // URL Validation helper
  const validateUrl = (url: string): boolean => {
    const trimmed = url.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  };

  // Run Career Search Agent
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBlockedNotice(null);

    const trimmedUrl = websiteUrl.trim();
    if (!validateUrl(trimmedUrl)) {
      setErrorMessage('Please enter a valid website URL starting with https:// or http://');
      addToast('Invalid URL scheme. Must start with http:// or https://', 'warning');
      return;
    }

    if (!targetRole.trim()) {
      addToast('Please specify a target role.', 'warning');
      return;
    }

    setIsRunning(true);
    setCurrentStepIndex(1);
    setResults([]);
    setMetrics(null);
    setIsDemoData(false);

    // Initialize stepper
    setSteps(
      INITIAL_STEPS.map((s, idx) => ({
        ...s,
        status: idx === 0 ? 'running' : 'pending',
      }))
    );

    // Dynamic step progression interval
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev < 7 ? prev + 1 : prev;
        setSteps((prevSteps) =>
          prevSteps.map((s) => {
            if (s.step < next) return { ...s, status: 'completed' };
            if (s.step === next) return { ...s, status: 'running' };
            return { ...s, status: 'pending' };
          })
        );
        return next;
      });
    }, 2200);

    try {
      const resp = await careerAgentClient.runCareerSearch({
        websiteUrl: trimmedUrl,
        targetRole,
        location,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        minimumMatch,
        maxResults,
        cvId: selectedCvId,
        language: selectedLanguage,
        aiProfile: selectedProfile,
        employmentType: employmentType !== 'any' ? employmentType : undefined,
        newGraduateOnly,
        japaneseLevel: japaneseLevel !== 'any' ? japaneseLevel : undefined,
      });

      clearInterval(stepInterval);
      // Never fall back to demo steps/results for a live run.
      setSteps(resp.steps || []);
      setResults(resp.results || []);
      setMetrics(resp.metrics || null);
      setIsDemoData(false);
      setCurrentStepIndex(Math.max(0, (resp.steps?.length || 1) - 1));

      if (resp.status === 'blocked') {
        setBlockedNotice(
          resp.blockedReason ||
            'TRON encountered a login wall or CAPTCHA on this website. TRON only inspects public career pages without authentication.'
        );
      } else if ((resp.results?.length || 0) > 0) {
        addToast(
          `Career Search Agent discovered ${resp.results.length} matching jobs.`,
          'success'
        );
      } else {
        addToast('Career Search finished with zero matches.', 'info');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      const status = err?.status ?? err?.statusCode;
      const detailMsg =
        status === 404
          ? 'Career Search API is not available yet (backend route missing). This page will not invent job results.'
          : err?.detail || err?.message || 'Career Search backend service is offline or not yet deployed.';
      setErrorMessage(detailMsg);
      setResults([]);
      setMetrics(null);
      setIsDemoData(false);
      setSteps([
        {
          step: 1,
          title: 'Career Search Unavailable',
          description: detailMsg,
          status: 'failed',
        },
      ]);
      setCurrentStepIndex(0);
    } finally {
      setIsRunning(false);
    }
  };

  // Explicit offline demo only — must never look like a live verified search.
  const handleLoadDemoData = () => {
    setWebsiteUrl('https://www.lycorp.co.jp/ja/careers/jobs');
    setTargetRole('Backend Engineer');
    setLocation('Tokyo');
    setKeywords('Java, Spring Boot, SQL, REST API');
    setMinimumMatch(70);
    setMaxResults(10);
    setErrorMessage(null);
    setBlockedNotice(null);
    setIsRunning(false);

    setSteps(DEMO_CAREER_STEPS);
    setCurrentStepIndex(7);
    setResults(DEMO_CAREER_RESULTS);
    setMetrics(DEMO_CAREER_METRICS);
    setIsDemoData(true);

    addToast('Loaded DEMO career UI fixtures (not live job results).', 'warning');
  };

  // Seamless Handoff to Interview Agent
  const handlePrepareInterview = (job: CareerJobResult) => {
    addToast(`Handoff to Interview Preparation Agent: ${job.company} — ${job.title}`, 'success');
    navigate('/career/interview-agent', {
      state: {
        prefillJob: {
          company: job.company,
          title: job.title,
          description: job.fullDescription || job.requiredSkills?.join(', '),
          cvId: selectedCvId,
        },
      },
    });
  };

  // Filtered and Sorted Results
  const filteredResults = results.filter((job) => {
    if (activeFilter === 'high') return job.matchScore >= 80;
    if (activeFilter === 'newgrad') return job.newGraduateEligible === true;
    if (activeFilter === 'tokyo') return job.location.toLowerCase().includes('tokyo');
    if (activeFilter === 'remote') return job.location.toLowerCase().includes('remote');
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'match') return b.matchScore - a.matchScore;
    if (sortBy === 'company') return a.company.localeCompare(b.company);
    if (sortBy === 'location') return a.location.localeCompare(b.location);
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F9FF] via-[#EBF4FC] to-[#F8FBFF] text-slate-800 p-4 md:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER SECTION WITH AGENT SUB-NAVIGATION SWITCH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100/80 pb-6">
          <div>
            {/* Secondary Agent Mode Switch */}
            <div className="inline-flex p-1 rounded-2xl bg-white/90 border border-[#D6E6F7] shadow-2xs mb-3">
              <button
                type="button"
                onClick={() => navigate('/career/interview-agent')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Interview Preparation</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Career Search Agent</span>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-100/80 text-cyan-800 border border-cyan-200">
                AGENTIC JOB DISCOVERY
              </span>
              <span className="text-[11px] text-slate-400">Public Pages Only</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
              TRON Career Search Agent
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Search a job website, analyze opportunities, and rank the best matches for your profile.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-600 text-xs font-bold shadow-sm hover:bg-blue-50/70 hover:border-blue-300 transition-all active:scale-[0.98]"
              title="Pre-populate with LINE Yahoo job postings for demonstration"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Demo Data (UI only)</span>
            </button>
          </div>
        </div>

        {/* ERROR OR BLOCKED WEBSITE BANNER */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Notice:</strong> {errorMessage}
                <div className="text-[11px] text-amber-700/80 mt-1">
                  Tip: Career Search backend is not available yet. You can load <strong>Demo Data (UI only)</strong> to preview layout — those jobs are not real.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-amber-600 hover:text-amber-800 text-xs font-bold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {blockedNotice && (
          <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Public Access Notice:</strong> {blockedNotice}
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE GRID: FORM (5 COLS) + TRACE (7 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: SEARCH FORM */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="p-6 rounded-3xl border border-white/80 shadow-lg shadow-blue-500/5">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Search Configuration</span>
              </h2>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* Job Website URL Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Job Website
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Public pages only</span>
                  </div>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      required
                      disabled={isRunning}
                      placeholder="https://company.example/jobs"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    TRON will inspect public job listings from this website.
                  </p>
                </div>

                {/* Target Role Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    Target Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      required
                      disabled={isRunning}
                      placeholder="e.g. Backend Engineer, Full-Stack"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Location & Language Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={isRunning}
                        placeholder="e.g. Tokyo, Remote"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                      Analysis Language
                    </label>
                    <div className="flex items-center justify-between px-3 py-2.5 text-xs rounded-xl bg-blue-50/60 border border-blue-200/80 font-medium text-slate-700">
                      <span className="font-semibold text-blue-900">{langDef.nativeName}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                        Global
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Keywords */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    Keywords / Tech Stack
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={isRunning}
                    placeholder="e.g. Java, Spring Boot, PostgreSQL, Docker"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Candidate CV Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Candidate Profile / CV
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/career/cv')}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Manage CV</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <select
                    value={selectedCvId ?? ''}
                    onChange={(e) =>
                      setSelectedCvId(e.target.value ? Number(e.target.value) : undefined)
                    }
                    disabled={isRunning}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs font-medium"
                  >
                    <option value="">No CV selected (General matching will be used)</option>
                    {userCvs.map((cv) => (
                      <option key={cv.id} value={cv.id}>
                        [CV #{cv.id}] {cv.filename}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AI Model Selector */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-slate-200 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      AI Model
                    </label>
                    <div className="text-[10px] text-slate-400">
                      {isRunning || results.length > 0
                        ? 'Locked for search evaluation'
                        : 'Reasoning model for job matching'}
                    </div>
                  </div>
                  <AiProfileSelector
                    selectedProfile={selectedProfile}
                    onChange={setSelectedProfile}
                    locked={isRunning || results.length > 0}
                    availableProfiles={aiProfiles}
                    placement="top"
                  />
                </div>

                {/* Advanced Filters Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="w-full flex items-center justify-between py-2 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                      <span>Advanced Filters</span>
                    </span>
                    {showAdvancedFilters ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showAdvancedFilters && (
                    <div className="p-4 mt-2 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 animate-in fade-in-0 duration-150 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Min Match Score
                          </label>
                          <select
                            value={minimumMatch}
                            onChange={(e) => setMinimumMatch(Number(e.target.value))}
                            className="w-full p-2 text-xs rounded-xl bg-white border border-slate-200"
                          >
                            <option value={50}>50% and higher</option>
                            <option value={60}>60% and higher</option>
                            <option value={70}>70% and higher (Default)</option>
                            <option value={80}>80% and higher (Strict)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Max Results
                          </label>
                          <select
                            value={maxResults}
                            onChange={(e) => setMaxResults(Number(e.target.value))}
                            className="w-full p-2 text-xs rounded-xl bg-white border border-slate-200"
                          >
                            <option value={5}>Top 5</option>
                            <option value={10}>Top 10 (Default)</option>
                            <option value={20}>Top 20</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Employment Type
                          </label>
                          <select
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                            className="w-full p-2 text-xs rounded-xl bg-white border border-slate-200"
                          >
                            <option value="any">Any Employment Type</option>
                            <option value="fulltime">Full-time (正社員)</option>
                            <option value="contract">Contract (契約社員)</option>
                            <option value="internship">Internship (インターン)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Japanese Level
                          </label>
                          <select
                            value={japaneseLevel}
                            onChange={(e) => setJapaneseLevel(e.target.value)}
                            className="w-full p-2 text-xs rounded-xl bg-white border border-slate-200"
                          >
                            <option value="any">Any Level</option>
                            <option value="n1">JLPT N1</option>
                            <option value="n2">JLPT N2</option>
                            <option value="n3">JLPT N3</option>
                            <option value="conversational">Conversational</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="newgrad-check"
                          checked={newGraduateOnly}
                          onChange={(e) => setNewGraduateOnly(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="newgrad-check" className="text-xs text-slate-700 font-semibold cursor-pointer">
                          New Graduate (新卒・第2新卒) eligible only
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Search Submit Button */}
                <div className="pt-2">
                  <NeonButton
                    type="submit"
                    disabled={isRunning}
                    className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Agent Inspecting Website Opportunities...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-cyan-300" />
                        <span>SEARCH RELEVANT JOBS</span>
                      </>
                    )}
                  </NeonButton>
                </div>
              </form>
            </GlassCard>

            {/* Privacy / Security Notice */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/70 text-slate-500 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                TRON only analyzes the public website you provide during this search. No passwords, private login credentials, or automatic applications are executed.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: AGENT EXECUTION TRACE */}
          <div className="lg:col-span-7 space-y-6">
            <CareerAgentTrace
              steps={steps}
              currentStepIndex={currentStepIndex}
              isRunning={isRunning}
              metrics={metrics}
              selectedAiProfile={selectedProfile}
              uiLanguage={uiLanguage}
            />
          </div>
        </div>

        {/* RESULTS SECTION */}
        <div className="pt-4 space-y-5">
          {/* Section Header & Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Recommended Opportunities
              </h2>
              {results.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-700 font-mono">
                  {filteredResults.length} / {results.length} Jobs
                </span>
              )}
            </div>

            {results.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {/* Filter Pills */}
                <div className="flex items-center p-1 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'high', label: 'High Match (80%+)' },
                    { id: 'newgrad', label: 'New Grad' },
                    { id: 'tokyo', label: 'Tokyo' },
                    { id: 'remote', label: 'Remote' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveFilter(f.id as any)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        activeFilter === f.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-semibold hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                  >
                    <option value="match">Best Match</option>
                    <option value="company">Company</option>
                    <option value="location">Location</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Results List */}
          {results.length > 0 ? (
            <div className="space-y-4">
              {sortedResults.length > 0 ? (
                sortedResults.map((job, idx) => (
                  <CareerJobCard
                    key={job.id}
                    job={job}
                    rank={idx + 1}
                    onViewDetails={setSelectedJobForDetails}
                    onPrepareInterview={handlePrepareInterview}
                    uiLanguage={uiLanguage}
                    isDemo={isDemoData}
                  />
                ))
              ) : (
                <div className="p-8 text-center rounded-3xl bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
                  <Filter className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="font-bold text-slate-700">No jobs match active filter</p>
                  <p>Try switching filter to &quot;All&quot; to see all discovered opportunities.</p>
                </div>
              )}
            </div>
          ) : !isRunning ? (
            /* Clean Empty State */
            <div className="p-12 text-center rounded-3xl bg-white/80 border border-[#D6E6F7] shadow-xs space-y-4 max-w-xl mx-auto my-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 font-display">
                  Find jobs that fit you
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Enter a job website and let TRON analyze the opportunities against your profile.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLoadDemoData}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Preview with verified Japanese IT demo postings</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* JOB DETAILS DRAWER MODAL */}
      <CareerJobDetailsDrawer
        job={selectedJobForDetails}
        onClose={() => setSelectedJobForDetails(null)}
        onPrepareInterview={handlePrepareInterview}
        uiLanguage={uiLanguage}
      />
    </div>
  );
};
