import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import { CareerJobCard } from '../components/career/CareerJobCard';
import { CareerJobDetailsDrawer } from '../components/career/CareerJobDetailsDrawer';
import { CareerAgentTrace } from '../components/career/CareerAgentTrace';
import { careerCenterClient } from '../services/careerCenterClient';
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
  { step: 1, title: 'Validate Mynavi / CareerMap target', status: 'pending' },
  { step: 2, title: 'Query Career V1 job search API', status: 'pending' },
  { step: 3, title: 'Filter official source URLs', status: 'pending' },
  { step: 4, title: 'Check provider ops status', status: 'pending' },
];

import { resolveLanguage } from '../utils/languageResolver';

export const CareerSearchAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, addToast, selectedLanguage, uiLanguage, aiProfiles, preferredAiProfile } = useApp();

  const langDef = resolveLanguage(selectedLanguage);

  // Official Career Center providers only: Mynavi + CareerMap
  const PROVIDERS = [
    {
      id: 'mynavi',
      label: 'Mynavi',
      url: 'https://job.mynavi.jp/',
    },
    {
      id: 'careermap',
      label: 'CareerMap',
      url: 'https://careermap.jp/',
    },
  ] as const;

  // Core Form State
  const [providerId, setProviderId] = useState<'mynavi' | 'careermap' | 'custom'>('mynavi');
  const [websiteUrl, setWebsiteUrl] = useState('https://job.mynavi.jp/');
  const [targetRole, setTargetRole] = useState('Backend Engineer');
  const [location, setLocation] = useState('Tokyo');
  const [keywords, setKeywords] = useState('Java, Spring Boot, SQL, REST API');
  const [minimumMatch, setMinimumMatch] = useState<number>(70);
  const [maxResults, setMaxResults] = useState<number>(10);
  const [selectedCvId, setSelectedCvId] = useState<number | undefined>(undefined);
  const [selectedProfile, setSelectedProfile] = useState<AiProfile>(preferredAiProfile);
  const [providerStatusNote, setProviderStatusNote] = useState<string | null>(null);
  /** Truthful search outcome — never treat HTTP 200 empty as fake discovery success */
  const [searchOutcome, setSearchOutcome] = useState<
    'IDLE' | 'SEARCHING' | 'RESULTS_FOUND' | 'NO_RESULTS' | 'SOURCE_UNAVAILABLE' | 'AUTHORIZATION_REQUIRED' | 'ERROR'
  >('IDLE');

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
    void loadProviderStatus();
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

  const loadProviderStatus = async () => {
    try {
      const ops = await careerCenterClient.getOpsStatus();
      const providers = ops.providers || [];
      if (providers.length > 0) {
        setProviderStatusNote(
          providers
            .map((p) => `${p.name || p.id}: ${p.status || p.detail || p.message || 'unknown'}`)
            .join(' · ')
        );
      }
    } catch {
      setProviderStatusNote(null);
    }
  };

  const isOfficialProviderUrl = (url: string): boolean => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host.includes('mynavi.jp') || host.includes('careermap.jp');
    } catch {
      return false;
    }
  };

  // URL Validation helper
  const validateUrl = (url: string): boolean => {
    const trimmed = url.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  };

  const handleSelectProvider = (id: 'mynavi' | 'careermap') => {
    const p = PROVIDERS.find((x) => x.id === id);
    if (!p) return;
    setProviderId(id);
    setWebsiteUrl(p.url);
  };

  const handleToggleSave = async (job: CareerJobResult) => {
    if (isDemoData) {
      addToast('Demo fixtures cannot be bookmarked on the server.', 'warning');
      return;
    }
    try {
      const next = !(job.saved === true);
      const resp = await careerCenterClient.toggleSaveJob(job.id, next);
      setResults((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, saved: resp.saved } : j))
      );
      addToast(resp.saved ? 'Job bookmarked' : 'Bookmark removed', 'success');
    } catch (err: any) {
      addToast(err?.detail || err?.message || 'Failed to save job', 'error');
    }
  };

  /** Authoritative Career V1 search only — never call /agents/career-search/run */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setBlockedNotice(null);
    setSearchOutcome('SEARCHING');

    const trimmedUrl = websiteUrl.trim();
    if (!validateUrl(trimmedUrl)) {
      setErrorMessage('Please enter a valid website URL starting with https:// or http://');
      addToast('Invalid URL scheme. Must start with http:// or https://', 'warning');
      setSearchOutcome('ERROR');
      return;
    }

    if (!isOfficialProviderUrl(trimmedUrl)) {
      setErrorMessage(
        'Official Career Center search supports Mynavi (mynavi.jp) and CareerMap (careermap.jp) only. Other sites are not searched.'
      );
      addToast('Only Mynavi and CareerMap are supported.', 'warning');
      setSearchOutcome('ERROR');
      return;
    }

    if (!targetRole.trim()) {
      addToast('Please specify a target role.', 'warning');
      setSearchOutcome('IDLE');
      return;
    }

    setIsRunning(true);
    setCurrentStepIndex(1);
    setResults([]);
    setMetrics(null);
    setIsDemoData(false);

    const truthfulSteps: CareerAgentStep[] = [
      { step: 1, title: 'Validate Mynavi / CareerMap target', status: 'running' },
      { step: 2, title: 'Query Career V1 job search API', status: 'pending' },
      { step: 3, title: 'Filter official source URLs', status: 'pending' },
      { step: 4, title: 'Check provider ops status', status: 'pending' },
    ];
    setSteps(truthfulSteps);

    const kw = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const started = Date.now();

    try {
      setSteps((prev) =>
        prev.map((s) =>
          s.step === 1 ? { ...s, status: 'completed' } : s.step === 2 ? { ...s, status: 'running' } : s
        )
      );

      const jobs = await careerCenterClient.searchJobs({
        query: targetRole,
        location,
        keywords: kw,
        employmentType: employmentType !== 'any' ? employmentType : undefined,
        newGraduateOnly,
        maxResults,
        language: selectedLanguage || 'ja',
      });

      setSteps((prev) =>
        prev.map((s) =>
          s.step === 2 ? { ...s, status: 'completed' } : s.step === 3 ? { ...s, status: 'running' } : s
        )
      );

      const filtered = (Array.isArray(jobs) ? jobs : []).filter((j) => {
        if (!j?.sourceUrl) return false;
        return isOfficialProviderUrl(j.sourceUrl);
      });

      setSteps((prev) =>
        prev.map((s) =>
          s.step === 3 ? { ...s, status: 'completed' } : s.step === 4 ? { ...s, status: 'running' } : s
        )
      );

      let opsNote = providerStatusNote;
      let authRequired = false;
      let sourceIssue = false;
      try {
        const ops = await careerCenterClient.getOpsStatus();
        const providers = ops.providers || [];
        opsNote = providers
          .map((p) => `${p.name || p.id}: ${p.status || p.detail || p.message || 'unknown'}`)
          .join(' · ');
        setProviderStatusNote(opsNote);
        authRequired = providers.some((p) =>
          String(p.status || p.message || '')
            .toUpperCase()
            .includes('AUTH')
        );
        sourceIssue = providers
          .filter((p) => {
            const id = String(p.id || p.name || '').toLowerCase();
            return id.includes('mynavi') || id.includes('careermap');
          })
          .every((p) => {
            const st = String(p.status || '').toUpperCase();
            return st.includes('BLOCKED') || st.includes('EMPTY') || st === 'UNAVAILABLE';
          });
      } catch {
        // ops optional
      }

      setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' as const })));
      setResults(filtered);
      setMetrics({
        jobsDiscovered: filtered.length,
        jobsAnalyzed: filtered.length,
        jobsMatched: filtered.filter((j) => (j.matchScore || 0) >= minimumMatch).length,
        durationMs: Date.now() - started,
        aiProfile: selectedProfile,
      });
      setIsDemoData(false);
      setCurrentStepIndex(truthfulSteps.length - 1);

      if (filtered.length > 0) {
        setSearchOutcome('RESULTS_FOUND');
        addToast(`Found ${filtered.length} Mynavi/CareerMap job(s).`, 'success');
      } else if (authRequired) {
        setSearchOutcome('AUTHORIZATION_REQUIRED');
        setBlockedNotice(
          opsNote ||
            'A provider requires OAuth / school-linked authorization. TRON does not invent vacancies.'
        );
        addToast('No listings — authorization required for at least one provider.', 'warning');
      } else if (sourceIssue) {
        setSearchOutcome('SOURCE_UNAVAILABLE');
        setBlockedNotice(
          opsNote ||
            'Approved providers returned no usable public listings (blocked, empty, or unavailable).'
        );
        addToast('No listings — source unavailable or empty scrape.', 'info');
      } else {
        setSearchOutcome('NO_RESULTS');
        addToast('Search finished with zero matches (genuine empty state).', 'info');
      }
    } catch (err: any) {
      const detailMsg =
        err?.detail || err?.message || 'Career job search failed. TRON will not invent job results.';
      setErrorMessage(detailMsg);
      setResults([]);
      setMetrics(null);
      setIsDemoData(false);
      setSearchOutcome('ERROR');
      setSteps([
        {
          step: 1,
          title: 'Career Job Search Error',
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
    setSearchOutcome('IDLE');

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
              Official sources: Mynavi and CareerMap only. TRON finds and recommends jobs — you apply on the original site.
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    Official providers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isRunning}
                        onClick={() => handleSelectProvider(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          providerId === p.id
                            ? 'bg-cyan-600 text-white border-cyan-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {providerStatusNote && (
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{providerStatusNote}</p>
                  )}
                </div>

                {/* Job Website URL Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Job Website
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">mynavi.jp / careermap.jp</span>
                  </div>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => {
                        setWebsiteUrl(e.target.value);
                        setProviderId('custom');
                      }}
                      required
                      disabled={isRunning}
                      placeholder="https://job.mynavi.jp/ or https://careermap.jp/"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Live search is limited to Mynavi and CareerMap. Empty results are shown honestly — TRON never invents vacancies.
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
              {searchOutcome !== 'IDLE' && !isDemoData && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border bg-white text-slate-600 border-slate-200">
                  {searchOutcome}
                </span>
              )}
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
                    onToggleSave={handleToggleSave}
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
            /* Honest empty / status state — never invent jobs */
            <div className="p-12 text-center rounded-3xl bg-white/80 border border-[#D6E6F7] shadow-xs space-y-4 max-w-xl mx-auto my-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 font-display">
                  {searchOutcome === 'NO_RESULTS'
                    ? 'No matching jobs found'
                    : searchOutcome === 'SOURCE_UNAVAILABLE'
                      ? 'Job source unavailable'
                      : searchOutcome === 'AUTHORIZATION_REQUIRED'
                        ? 'Authorization required'
                        : searchOutcome === 'ERROR'
                          ? 'Search failed'
                          : 'Find jobs that fit you'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {errorMessage ||
                    blockedNotice ||
                    (searchOutcome === 'NO_RESULTS'
                      ? 'Providers returned no listings for this query. TRON does not invent results.'
                      : 'Search Mynavi or CareerMap. Results come only from approved providers.')}
                </p>
                {searchOutcome !== 'IDLE' && (
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 pt-1">
                    Status: {searchOutcome}
                  </p>
                )}
              </div>
              {searchOutcome === 'IDLE' && (
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
              )}
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
