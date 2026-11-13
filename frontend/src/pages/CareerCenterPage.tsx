import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Sparkles,
  FileText,
  History,
  ArrowRight,
  UserRound,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Thin career landing for core features only:
 * Interview Practice, AI CV Builder, Candidate Profile, Interview History.
 * Job Finder / Company Analysis / Mentor cards intentionally removed from public UI.
 */
export const CareerCenterPage: React.FC = () => {
  const { uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10 animate-in fade-in duration-300">
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-blue-500/15 overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Briefcase className="w-3.5 h-3.5 text-cyan-200" />
            <span>{ja ? 'コアキャリア機能' : 'Core Career Tools'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            {ja ? '面接練習 & 履歴書' : 'Interview & CV'}
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            {ja
              ? '面接練習、AI履歴書ビルダー、候補者プロフィールへすばやくアクセスできます。'
              : 'Quick access to Interview Practice, AI CV Builder, and Candidate Profile.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/career/interview"
          className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
              {ja ? '面接練習' : 'Interview Practice'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {ja
                ? 'AI面接シミュレーションとフィードバック。'
                : 'Practice realistic AI interviews with feedback.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
            <span>{ja ? '開始する' : 'Start Practice'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/career/cv-builder"
          className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
              {ja ? 'AI履歴書ビルダー' : 'AI CV Builder'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {ja
                ? '日本語履歴書・英語レジュメの作成、プレビュー、書き出し。'
                : 'Japanese 履歴書 and English résumé with preview and export.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform">
            <span>{ja ? 'ビルダーを開く' : 'Open Builder'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/career/profile"
          className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserRound className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
              {ja ? '候補者プロフィール' : 'Candidate Profile'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {ja
                ? '履歴書・面接で共有する候補者情報の編集。'
                : 'Shared facts used by CV Builder and interviews.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform">
            <span>{ja ? '編集する' : 'Edit Profile'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/career/history"
          className="group relative p-5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
              {ja ? '面接履歴' : 'Interview History'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {ja
                ? '完了した面接セッションとフィードバックを確認。'
                : 'Review completed sessions and feedback reports.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:translate-x-0.5 transition-transform">
            <span>{ja ? '履歴を見る' : 'View History'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
};
