import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Sparkles,
  Bot,
  FileText,
  History,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

export const CareerCenterPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-500/15 overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Briefcase className="w-3.5 h-3.5 text-cyan-200" />
            <span>AI Career & Recruitment Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            TRON Career Center
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Career preparation, job matching, and interview intelligence in one dedicated place.
          </p>
        </div>
      </div>

      {/* SECTION: CAREER INTELLIGENCE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">CAREER INTELLIGENCE</h2>
              <p className="text-xs text-slate-500">
                End-to-end recruitment preparation, job matching, and AI simulation
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Job Finder */}
          <Link
            to="/career/jobs"
            className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                Job Finder
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Find relevant jobs matching your skills and profile.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <span>Open Job Finder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 2: Interview Practice */}
          <Link
            to="/career/interview"
            className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                Interview Practice
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Practice realistic AI interviews with dynamic feedback and voice analysis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <span>Start Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 3: Interview Agent */}
          <Link
            to="/career/interview-agent"
            className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                Interview Agent
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                CV + Job + Gap Analysis + Strategy + Tailored Questions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <span>Run Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 4: CV Manager */}
          <Link
            to="/career/cv"
            className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                CV Manager
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Manage candidate CVs, parse profiles, and generate ATS summaries.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform">
              <span>Manage CVs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* SECONDARY SECTION: INTERVIEW HISTORY & MENTORSHIP */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">HISTORY & PROGRESSION</h2>
              <p className="text-xs text-slate-500">
                Track previous interview evaluations, feedback reports, and skill growth
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/career/history"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  Interview History
                </h4>
                <p className="text-xs text-slate-500">Review completed interviews and radar scores</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </Link>

          <Link
            to="/mentor"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                  AI Mentor
                </h4>
                <p className="text-xs text-slate-500">Personalized career coaching and speech guidance</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};
