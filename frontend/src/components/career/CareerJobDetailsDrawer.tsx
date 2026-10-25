import React, { useEffect } from 'react';
import {
  X,
  ExternalLink,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
  Briefcase,
  Globe,
  Coins,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { CareerJobResult } from '../../types/careerAgent';

interface CareerJobDetailsDrawerProps {
  job: CareerJobResult | null;
  onClose: () => void;
  onPrepareInterview: (job: CareerJobResult) => void;
  uiLanguage?: string;
}

export const CareerJobDetailsDrawer: React.FC<CareerJobDetailsDrawerProps> = ({
  job,
  onClose,
  onPrepareInterview,
  uiLanguage = 'en',
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  const reasonsList = Array.isArray(job.reasons)
    ? job.reasons
    : job.reasons
    ? [job.reasons]
    : [];

  const risksList = Array.isArray(job.risks)
    ? job.risks
    : job.risks
    ? [job.risks]
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white/98 backdrop-blur-2xl border-l border-[#D6E6F7] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100/80 text-blue-800 border border-blue-200/60 font-mono">
                  {job.matchScore}% MATCH
                </span>
                {job.employmentType && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                    {job.employmentType}
                  </span>
                )}
              </div>
              <h2 className="font-display font-extrabold text-lg md:text-xl text-slate-900 leading-snug">
                {job.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>{job.company}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.location}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
            {/* Primary Action Row */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 border border-blue-100 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  Ready to practice for this role?
                </span>
                <span className="text-[11px] text-slate-500">
                  Transfer company and job context to Interview Preparation Agent.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onPrepareInterview(job);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              >
                <GraduationCap className="w-4 h-4" />
                <span>PREPARE INTERVIEW</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Why TRON Recommends This */}
            {reasonsList.length > 0 && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/90 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>TRON Match Analysis & Recommendation</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc text-slate-700 leading-relaxed text-[11px]">
                  {reasonsList.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills Breakdown */}
            <div className="space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-slate-400 font-mono text-[10px]">
                Skills & Tech Stack Comparison
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-emerald-700 font-bold block mb-1 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Matched Strengths ({job.matchedSkills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.matchedSkills && job.matchedSkills.length > 0 ? (
                      job.matchedSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No specific skill matches detected.</span>
                    )}
                  </div>
                </div>

                {job.missingSkills && job.missingSkills.length > 0 && (
                  <div className="pt-2">
                    <span className="text-amber-700 font-bold block mb-1 text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Missing / Desired Skills ({job.missingSkills.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {job.missingSkills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Structured Requirements Grid (Unknown values UX rule strictly followed) */}
            <div className="space-y-2.5">
              <h4 className="font-bold uppercase tracking-wider text-slate-400 font-mono text-[10px]">
                Eligibility & Candidate Requirements
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
                    New Graduate / Entry Level
                  </span>
                  <span className="font-bold text-slate-800">
                    {job.newGraduateEligible === true
                      ? '✓ Yes (新卒・第2新卒 歓迎)'
                      : job.newGraduateEligible === false
                      ? 'Experienced / Mid-career only'
                      : 'Unknown'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
                    Japanese Language Level
                  </span>
                  <span className="font-bold text-slate-800">
                    {job.japaneseRequirement || 'Not stated'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
                    Working Visa Support
                  </span>
                  <span className="font-bold text-slate-800">
                    {job.visaSupport === true
                      ? '✓ Yes (Sponsorship provided)'
                      : job.visaSupport === false
                      ? 'No visa sponsorship'
                      : 'Unknown'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
                    Expected Salary Range
                  </span>
                  <span className="font-bold text-slate-800">
                    {job.salary || 'Not stated'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
                  Education & Degree Eligibility
                </span>
                <span className="font-semibold text-slate-800 leading-relaxed block mt-0.5">
                  {job.educationRequirement || 'Not stated in public listing'}
                </span>
              </div>
            </div>

            {/* Identified Interview Risks */}
            {risksList.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Interview Readiness Risks to Prepare For</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc text-amber-950 leading-relaxed text-[11px]">
                  {risksList.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full Job Description Snippet */}
            {job.fullDescription && (
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-400 font-mono text-[10px] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Original Job Posting Summary</span>
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 whitespace-pre-wrap font-sans leading-relaxed text-slate-700 text-xs max-h-48 overflow-y-auto">
                  {job.fullDescription}
                </div>
              </div>
            )}

            {/* External Source Link */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-700 block text-xs">Verify on Employer Site</span>
                <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                  {job.sourceUrl}
                </span>
              </div>
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <span>Open Original Job</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                onPrepareInterview(job);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>PREPARE INTERVIEW WITH TRON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
