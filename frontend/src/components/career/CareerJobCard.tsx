import React from 'react';
import {
  ExternalLink,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building2,
  MapPin,
  Globe,
  FileCheck,
  Briefcase,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { CareerJobResult } from '../../types/careerAgent';

interface CareerJobCardProps {
  job: CareerJobResult;
  rank?: number;
  onViewDetails: (job: CareerJobResult) => void;
  onPrepareInterview: (job: CareerJobResult) => void;
  onToggleSave?: (job: CareerJobResult) => void;
  uiLanguage?: string;
  isDemo?: boolean;
}

export const CareerJobCard: React.FC<CareerJobCardProps> = ({
  job,
  rank,
  onViewDetails,
  onPrepareInterview,
  onToggleSave,
  uiLanguage = 'en',
  isDemo = false,
}) => {
  // Score styling
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'from-emerald-500 to-teal-500 text-emerald-950 border-emerald-300/80 bg-emerald-50/90';
    if (score >= 70) return 'from-[#008CFF] to-[#00DFFF] text-blue-950 border-blue-300/80 bg-blue-50/90';
    return 'from-amber-500 to-yellow-500 text-amber-950 border-amber-300/80 bg-amber-50/90';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return 'bg-emerald-500 text-white';
    if (score >= 70) return 'bg-blue-600 text-white';
    return 'bg-amber-500 text-white';
  };

  const reasonsList = Array.isArray(job.reasons)
    ? job.reasons
    : job.reasons
    ? [job.reasons]
    : [];

  return (
    <div className="group relative p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-[#D6E6F7] shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
      {/* Top Header: Rank, Title, Match Score */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {rank && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                #{rank}
              </span>
            )}
            <h3 className="font-display font-extrabold text-base md:text-lg text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              {job.title}
            </h3>
            {isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                DEMO DATA
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>{job.company}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.location}</span>
            </span>
            {job.employmentType && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.employmentType}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Match Score Badge */}
        <div className="shrink-0 flex items-center sm:flex-col sm:items-end gap-1.5">
          <div className={`px-3 py-1.5 rounded-2xl font-display font-extrabold text-xs sm:text-sm shadow-xs border flex items-center gap-1.5 ${getScoreColor(job.matchScore)}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{job.matchScore}% MATCH</span>
          </div>
          {job.matchTier && (
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
              {job.matchTier} FIT
            </span>
          )}
        </div>
      </div>

      {/* Skills Analysis Row */}
      <div className="py-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {job.matchedSkills && job.matchedSkills.length > 0 && (
            job.matchedSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70"
              >
                <span>{skill}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </span>
            ))
          )}

          {job.missingSkills && job.missingSkills.length > 0 && (
            job.missingSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70"
                title="Missing or preferred skill"
              >
                <span>{skill}</span>
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* Structured Opportunity Attributes (Strict 'Unknown' UX rule) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 border-t border-slate-100/90 text-xs bg-slate-50/50 rounded-2xl px-3 my-1">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            New Graduate
          </span>
          <span className="font-semibold text-slate-800">
            {job.newGraduateEligible === true
              ? '✓ Eligible (新卒可)'
              : job.newGraduateEligible === false
              ? 'Experienced only'
              : 'Unknown'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Japanese Level
          </span>
          <span className="font-semibold text-slate-800">
            {job.japaneseRequirement || 'Not stated'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Visa Support
          </span>
          <span className="font-semibold text-slate-800">
            {job.visaSupport === true
              ? '✓ Available'
              : job.visaSupport === false
              ? 'Not available'
              : 'Unknown'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Education
          </span>
          <span className="font-semibold text-slate-800 truncate block" title={job.educationRequirement || 'Not stated'}>
            {job.educationRequirement || 'Not stated'}
          </span>
        </div>
      </div>

      {/* TRON Recommendation Reason */}
      {reasonsList.length > 0 && (
        <div className="mt-2.5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/70 text-xs space-y-1 text-left">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Why TRON recommends this:</span>
          </div>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            {reasonsList[0]}
          </p>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors p-1"
          title="Verify directly on original employer career portal"
        >
          <span>Open Original Job</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="flex items-center gap-2">
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(job)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border shadow-2xs transition-all active:scale-[0.98] ${
                job.saved
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {job.saved
                ? uiLanguage === 'ja'
                  ? '保存済み'
                  : 'SAVED'
                : uiLanguage === 'ja'
                  ? 'ブックマーク'
                  : 'BOOKMARK'}
            </button>
          )}
          {/* View Details Drawer CTA */}
          <button
            type="button"
            onClick={() => onViewDetails(job)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300 transition-all active:scale-[0.98]"
          >
            {uiLanguage === 'ja' ? '詳細を見る' : 'VIEW DETAILS'}
          </button>

          {/* Seamless Handoff to Interview Agent CTA */}
          <button
            type="button"
            onClick={() => onPrepareInterview(job)}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/20 hover:brightness-105 transition-all flex items-center gap-1.5 active:scale-[0.98]"
            title="Transfer company and role details to Interview Preparation Agent"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{uiLanguage === 'ja' ? '面接対策へ進む' : 'PREPARE INTERVIEW'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
