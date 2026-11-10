import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Mic,
  Briefcase,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WhyWeBuiltSection: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const why = t.about.whyWeBuilt;
  const caps = t.about.capabilities;

  const coreCapabilities = [
    {
      title: caps.chat.title,
      badge: caps.chat.badge,
      desc: caps.chat.desc,
      icon: MessageSquare,
      path: '/chat',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      btnColor: 'hover:bg-blue-600 hover:text-white',
    },
    {
      title: caps.voice.title,
      badge: caps.voice.badge,
      desc: caps.voice.desc,
      icon: Mic,
      path: '/voice',
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      btnColor: 'hover:bg-cyan-600 hover:text-white',
    },
    {
      title: caps.interview.title,
      badge: caps.interview.badge,
      desc: caps.interview.desc,
      icon: Briefcase,
      path: '/career/interview',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      btnColor: 'hover:bg-indigo-600 hover:text-white',
    },
    {
      title: caps.cv.title,
      badge: caps.cv.badge,
      desc: caps.cv.desc,
      icon: FileText,
      path: '/career/cv-builder',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      btnColor: 'hover:bg-emerald-600 hover:text-white',
    },
  ];

  return (
    <section className="space-y-8">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold uppercase tracking-wider">
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{why.badge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
          {why.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          {why.subtitle}
        </p>
      </div>

      {/* Problem vs Approach Two-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* The Problem Card */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-glass-card p-6 md:p-8 space-y-4 hover:border-slate-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-display">
                {why.problemTitle}
              </h3>
              <p className="text-xs text-slate-500">{why.problemDesc}</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            {why.problems.map((prob, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <span>{prob}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Our Approach Card */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-glass-card p-6 md:p-8 space-y-4 hover:border-blue-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-display">
                {why.approachTitle}
              </h3>
              <p className="text-xs text-slate-500">{why.approachDesc}</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            {why.approaches.map((appr, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>{appr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Core Capabilities Deep-Dive Grid */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Our Four Core Capabilities
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {coreCapabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-white/90 backdrop-blur-xl border border-white/95 shadow-glass-card p-5 sm:p-6 flex flex-col justify-between hover:-translate-y-1 hover:shadow-glass-pop transition-all group cursor-pointer"
                onClick={() => navigate(cap.path)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${cap.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                      {cap.badge}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 font-display group-hover:text-blue-600 transition-colors">
                    {cap.title}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
