import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { authApi } from '../services/httpClient';
import {
  AgentRunResponse,
  AgentStepDto,
  AgentResultDto,
  PracticeQuestion,
} from '../types/agent';
import { AiProfile } from '../types/aiProfile';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import {
  Bot,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Award,
  BookOpen,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  History,
  FileText,
  Loader2,
  Zap,
  Lock,
  Search,
} from 'lucide-react';

import { resolveLanguage } from '../utils/languageResolver';

export const AgentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addToast, selectedLanguage, uiLanguage, aiProfiles, preferredAiProfile } = useApp();

  const langDef = resolveLanguage(selectedLanguage);
  const [selectedProfile, setSelectedProfile] = useState<AiProfile>(preferredAiProfile);
  // Form State
  const [goal, setGoal] = useState('Prepare me for a Backend Engineer interview at LINE Yahoo.');
  const [companyName, setCompanyName] = useState('LINE Yahoo');
  const [jobPosition, setJobPosition] = useState('Backend Engineer');
  const [jobDescription, setJobDescription] = useState(
    'We are looking for a backend engineer with knowledge of Java, Spring Boot, REST API development, SQL databases, Git, team-based software development, testing, and Japanese communication skills. Experience with cloud infrastructure is preferred.'
  );
  const [selectedCvId, setSelectedCvId] = useState<number | undefined>(undefined);

  // Listen for handoff from Career Search Agent
  useEffect(() => {
    if (location.state && (location.state as any).prefillJob) {
      const p = (location.state as any).prefillJob;
      if (p.company) setCompanyName(p.company);
      if (p.title) setJobPosition(p.title);
      if (p.description) setJobDescription(p.description);
      if (p.cvId) setSelectedCvId(p.cvId);
      setGoal(`Prepare me for a ${p.title} interview at ${p.company}.`);
      addToast(`Loaded target job from Career Search: ${p.company} — ${p.title}`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state]);

  // Available user CVs
  const [userCvs, setUserCvs] = useState<Array<{ id: number; filename: string }>>([]);

  // Execution & Results State
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [agentResponse, setAgentResponse] = useState<AgentRunResponse | null>(null);
  const [historyRuns, setHistoryRuns] = useState<AgentRunResponse[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [startingInterview, setStartingInterview] = useState(false);

  // Load user CVs & previous agent runs on mount
  useEffect(() => {
    loadCvs();
    loadHistory();
  }, []);

  const loadCvs = async () => {
    try {
      const cvs = await authApi.getCvDocuments();
      if (Array.isArray(cvs)) {
        setUserCvs(cvs);
        if (cvs.length > 0) {
          setSelectedCvId(cvs[0].id);
        }
      }
    } catch {
      // Non-critical if no CVs yet
    }
  };

  const loadHistory = async () => {
    try {
      const runs = await authApi.getAgentRuns();
      if (Array.isArray(runs)) {
        setHistoryRuns(runs);
      }
    } catch {
      // Non-critical
    }
  };

  const handleLoadDemoData = () => {
    setGoal('Prepare me for a Backend Engineer interview at LINE Yahoo.');
    setCompanyName('LINE Yahoo');
    setJobPosition('Backend Engineer');
    setJobDescription(
      'We are looking for a backend engineer with knowledge of Java, Spring Boot, REST API development, SQL databases, Git, team-based software development, testing, and Japanese communication skills. Experience with cloud infrastructure is preferred.'
    );
    addToast('LINE Yahoo scenario pre-filled for teacher demonstration.', 'info');
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !companyName || !jobPosition || !jobDescription) {
      addToast('Please provide Goal, Company, Position, and Job Description.', 'warning');
      return;
    }

    setIsRunning(true);
    setCurrentStepIndex(1);
    setAgentResponse(null);

    // Simulated progress stepper while waiting for model
    const stepperInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < 5 ? prev + 1 : prev));
    }, 2800);

    try {
      const resp: AgentRunResponse = await authApi.runAgent({
        goal,
        companyName,
        jobPosition,
        jobDescription,
        language: selectedLanguage,
        cvId: selectedCvId,
        aiProfile: selectedProfile,
      });

      clearInterval(stepperInterval);
      setAgentResponse(resp);
      setCurrentStepIndex(resp.steps.length);
      loadHistory();

      addToast(`Agent completed autonomous run with ${resp.steps.length} steps across ${resp.metrics?.toolsUsed?.length || 5} tools.`, 'success');
    } catch (err: any) {
      clearInterval(stepperInterval);
      addToast(err?.message || 'An error occurred while running the agent.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartInterviewFromPrep = async () => {
    if (!agentResponse) return;
    setStartingInterview(true);
    try {
      const startResp = await authApi.startInterviewFromAgent(agentResponse.runId);
      addToast('Interactive practice room loaded with agent preparation questions.', 'success');
      navigate(`/interview/room?id=${startResp.interviewId}`);
    } catch (err: any) {
      addToast(err?.message || 'Could not launch interview session.', 'error');
    } finally {
      setStartingInterview(false);
    }
  };

  const handleSelectHistoryRun = async (runId: string) => {
    try {
      const detailed = await authApi.getAgentRun(runId);
      setAgentResponse(detailed);
      setGoal(detailed.goal);
      setCompanyName(detailed.companyName);
      setJobPosition(detailed.jobPosition);
      if (detailed.aiProfile && ['FAST', 'QUALITY'].includes(detailed.aiProfile)) {
        setSelectedProfile(detailed.aiProfile as AiProfile);
      }
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err: any) {
      addToast(err?.message || 'Failed to load run details.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F9FF] via-[#EBF4FC] to-[#F8FBFF] text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-100/80 pb-6">
          <div>
            {/* Secondary Agent Mode Switch */}
            <div className="inline-flex p-1 rounded-2xl bg-white/90 border border-[#D6E6F7] shadow-2xs mb-3">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-xs"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Interview Preparation</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/career/jobs')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Career Search Agent</span>
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold tracking-wide uppercase">
                <Bot className="w-4 h-4 text-blue-500 animate-pulse" />
                <span>Autonomous Agentic AI Prototype</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
              TRON Interview Preparation Agent
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 max-w-2xl leading-relaxed">
              True multi-step bounded agent workflow:
              <span className="font-mono text-xs font-semibold text-blue-600 ml-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                GOAL → PLAN → CHOOSE TOOL → EXECUTE → OBSERVE → DECIDE → FINISH
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-600 text-xs font-bold shadow-sm hover:bg-blue-50/70 hover:border-blue-300 transition-all active:scale-[0.98]"
              title="Pre-populate with LINE Yahoo Backend scenario"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Teacher Demo Data</span>
            </button>
          </div>
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: FORM & SETTINGS (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="p-6 rounded-3xl border border-white/80 shadow-lg shadow-blue-500/5">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600 fill-blue-600" />
                <span>Agent Configuration</span>
              </h2>

              <form onSubmit={handleRunAgent} className="space-y-4">
                {/* Goal Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Candidate Goal
                  </label>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                    disabled={isRunning}
                    placeholder="e.g. Prepare me for Backend Engineer at LINE Yahoo"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                </div>

                {/* Company & Role Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Company
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      disabled={isRunning}
                      placeholder="LINE Yahoo"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Position
                    </label>
                    <input
                      type="text"
                      value={jobPosition}
                      onChange={(e) => setJobPosition(e.target.value)}
                      required
                      disabled={isRunning}
                      placeholder="Backend Engineer"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Job Description Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Job Requirements / Description
                  </label>
                  <textarea
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                    disabled={isRunning}
                    placeholder="Paste job description..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs resize-none"
                  />
                </div>

                {/* Language & CV Selector Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Response Language
                    </label>
                    <div className="flex items-center justify-between px-3 py-2.5 text-xs rounded-xl bg-blue-50/60 border border-blue-200/80 font-medium text-slate-700">
                      <span className="font-semibold text-blue-900">{langDef.nativeName}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                        Global
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Candidate CV
                    </label>
                    <select
                      value={selectedCvId ?? ''}
                      onChange={(e) =>
                        setSelectedCvId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      disabled={isRunning}
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs font-medium"
                    >
                      <option value="">No CV (General Prep)</option>
                      {userCvs.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          [ID: {cv.id}] {cv.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* AI MODEL SELECTION */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-slate-200 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      AI Model
                    </label>
                    <div className="text-[10px] text-slate-400">
                      {isRunning || !!agentResponse ? 'Locked for active agent run' : 'Reasoning profile for analysis'}
                    </div>
                  </div>
                  <AiProfileSelector
                    selectedProfile={selectedProfile}
                    onChange={setSelectedProfile}
                    locked={isRunning || !!agentResponse}
                    availableProfiles={aiProfiles}
                    placement="top"
                  />
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2">
                  <NeonButton
                    type="submit"
                    disabled={isRunning}
                    className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Agent Running Autonomous Loop...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300" />
                        <span>RUN AGENT</span>
                      </>
                    )}
                  </NeonButton>
                </div>
              </form>
            </GlassCard>

            {/* PREVIOUS RUNS HISTORY DRAWER */}
            {historyRuns.length > 0 && (
              <GlassCard className="p-5 rounded-3xl border border-white/80 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Previous Agent Runs</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {historyRuns.length} runs
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {historyRuns.map((r) => (
                    <button
                      key={r.runId}
                      type="button"
                      onClick={() => handleSelectHistoryRun(r.runId)}
                      className={`
                        w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between
                        ${agentResponse?.runId === r.runId
                          ? 'bg-blue-50/90 border-blue-200 text-blue-900 font-semibold'
                          : 'bg-white/60 border-slate-100 text-slate-600 hover:bg-blue-50/40 hover:border-blue-100'
                        }
                      `}
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold text-slate-800 truncate">{r.companyName} — {r.jobPosition}</div>
                        <div className="text-[10px] text-slate-400 truncate">{r.goal}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        <span>{r.steps?.length || r.metrics?.stepsExecuted || 5} steps</span>
                      </div>
                    </button>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          {/* RIGHT COLUMN: LIVE EXECUTION TRACE & RESULT DISPLAY (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            {/* TEACHER-DEMO LIVE EXECUTION TRACE */}
            <GlassCard className="p-6 rounded-3xl border border-white/80 shadow-lg shadow-blue-500/5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-extrabold text-slate-900">
                    Execution Trace & Tool Pipeline
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Running Step {currentStepIndex}/5
                    </span>
                  ) : agentResponse ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      COMPLETED
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Ready</span>
                  )}
                </div>
              </div>

              {/* STEP CARDS */}
              <div className="space-y-3">
                {[
                  {
                    num: 1,
                    action: 'CV_ANALYSIS',
                    title: 'CV & Candidate Profile Analysis',
                    tool: 'CvAnalysisTool',
                    desc: selectedCvId
                      ? 'Extracts verified candidate skills and qualifications without hallucination.'
                      : 'Candidate CV not attached; handled skipped CV state safely.',
                  },
                  {
                    num: 2,
                    action: 'JOB_ANALYSIS',
                    title: 'Target Job Requirements Analysis',
                    tool: 'JobAnalysisTool',
                    desc: 'Extracts technical topics, core responsibilities, and expected competencies.',
                  },
                  {
                    num: 3,
                    action: 'GAP_ANALYSIS',
                    title: 'Competency Gap & Overlap Analysis',
                    tool: 'GapAnalysisTool',
                    desc: 'Evaluates candidate strengths vs job requirements; strictly identifies missing skills.',
                  },
                  {
                    num: 4,
                    action: 'INTERVIEW_STRATEGY',
                    title: 'Interview Preparation Strategy',
                    tool: 'InterviewStrategyTool',
                    desc: 'Builds tailored preparation roadmap addressing identified weaknesses.',
                  },
                  {
                    num: 5,
                    action: 'QUESTION_GENERATION',
                    title: 'Targeted Practice Question Generation',
                    tool: 'QuestionGenerationTool',
                    desc: 'Generates 5 contextual interview questions with evaluation criteria and hints.',
                  },
                ].map((s) => {
                  const stepResult = agentResponse?.steps.find((st) => st.action === s.action);
                  const isFinished = stepResult?.status === 'completed' || stepResult?.status === 'skipped';
                  const isCurrent = isRunning && currentStepIndex === s.num;
                  const isPending = !stepResult && !isCurrent;

                  return (
                    <div
                      key={s.num}
                      className={`
                        p-3.5 rounded-2xl border transition-all flex items-start gap-3.5
                        ${isFinished
                          ? 'bg-emerald-50/50 border-emerald-200/80 text-slate-800'
                          : isCurrent
                          ? 'bg-blue-50/80 border-blue-300 shadow-sm shadow-blue-500/10'
                          : 'bg-white/40 border-slate-100 opacity-60'
                        }
                      `}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isFinished ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            ✓
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs animate-pulse">
                            {s.num}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
                            {s.num}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            Step {s.num} — {s.title}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600">
                            {s.tool}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {stepResult?.description || s.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AGENT METRICS BAR */}
              {agentResponse?.metrics && (
                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Status</div>
                    <div className="text-xs font-extrabold text-blue-700 uppercase mt-0.5">
                      {agentResponse.status}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Tools Used</div>
                    <div className="text-xs font-extrabold text-blue-700 mt-0.5">
                      {agentResponse.metrics.toolsUsed.length || 5} Tools
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Steps</div>
                    <div className="text-xs font-extrabold text-blue-700 mt-0.5">
                      {agentResponse.metrics.stepsExecuted || agentResponse.steps?.length || 5} Steps
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                    <div className="text-[10px] font-bold text-purple-600 uppercase">Model Profile</div>
                    <div className="text-xs font-extrabold text-purple-700 mt-0.5 flex items-center justify-center gap-1">
                      <span>{agentResponse.aiProfile || selectedProfile}</span>
                      <Lock className="w-3 h-3 text-purple-500" />
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Execution Time</div>
                    <div className="text-xs font-extrabold text-blue-700 mt-0.5">
                      {(agentResponse.metrics.durationMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* RESULTS VIEW */}
            {agentResponse?.result && (
              <div className="space-y-6 animate-fadeIn">
                {/* STRENGTHS & GAPS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Candidate Strengths */}
                  <GlassCard className="p-5 rounded-3xl border border-emerald-100 shadow-sm bg-gradient-to-b from-emerald-50/30 to-white">
                    <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>Candidate Strengths & Overlap</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {agentResponse.result.candidateStrengths?.length > 0 ? (
                        agentResponse.result.candidateStrengths.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200"
                          >
                            ✓ {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No specific strengths mapped</span>
                      )}
                    </div>
                  </GlassCard>

                  {/* Skill Gaps */}
                  <GlassCard className="p-5 rounded-3xl border border-amber-100 shadow-sm bg-gradient-to-b from-amber-50/30 to-white">
                    <h3 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Identified Skill Gaps to Prepare</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {agentResponse.result.skillGaps?.length > 0 ? (
                        agentResponse.result.skillGaps.map((g, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100/70 text-amber-800 border border-amber-200"
                          >
                            ⚠ {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No critical gaps identified</span>
                      )}
                    </div>
                  </GlassCard>
                </div>

                {/* PRIORITY PREPARATION ROADMAP */}
                {agentResponse.result.priorityTopics?.length > 0 && (
                  <GlassCard className="p-5 rounded-3xl border border-white/80 shadow-sm">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Priority Preparation Topics</span>
                    </h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 font-medium">
                      {agentResponse.result.priorityTopics.map((topic, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <span className="font-semibold text-slate-900">{topic}</span>
                        </li>
                      ))}
                    </ol>
                  </GlassCard>
                )}

                {/* PRACTICE QUESTIONS */}
                {agentResponse.result.practiceQuestions?.length > 0 && (
                  <GlassCard className="p-6 rounded-3xl border border-white/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span>Generated Practice Questions ({agentResponse.result.practiceQuestions.length})</span>
                      </h3>
                      <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                        Tailored to {agentResponse.companyName}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {agentResponse.result.practiceQuestions.map((q: PracticeQuestion, idx: number) => {
                        const isExpanded = expandedQuestion === idx;
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-200/80 bg-white/70 overflow-hidden shadow-2xs transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                              className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 uppercase">
                                    {q.category || 'Technical'}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                                    {q.difficulty || 'Medium'}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-slate-900 leading-relaxed">
                                  {idx + 1}. {q.question}
                                </div>
                              </div>
                              <div className="shrink-0 text-slate-400 mt-1">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-blue-50/30 text-xs space-y-2">
                                <div>
                                  <span className="font-bold text-slate-700">Why this matters: </span>
                                  <span className="text-slate-600">{q.whyThisQuestionMatters}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-blue-700">Preparation Hint: </span>
                                  <span className="text-slate-600">{q.preparationHint}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* LAUNCH INTERVIEW BUTTON */}
                    <div className="pt-3">
                      <NeonButton
                        onClick={handleStartInterviewFromPrep}
                        disabled={startingInterview}
                        className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25"
                      >
                        {startingInterview ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Launching Interactive Room...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 text-white fill-white" />
                            <span>Start Interactive Practice Interview with this Preparation</span>
                            <ArrowRight className="w-4 h-4 text-white" />
                          </>
                        )}
                      </NeonButton>
                    </div>
                  </GlassCard>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
