import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { TronLogo } from '../components/common/TronLogo';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Send,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

export const AIMentorPage: React.FC = () => {
  const navigate = useNavigate();
  const { uiLanguage } = useApp();

  const [activeTab, setActiveTab] = useState<'manners' | 'keigo' | 'star'>('manners');

  const mannersTips = [
    {
      title: '入室と挨拶のマナー (Entering & Greeting)',
      desc: 'ドアを3回ノックし、「失礼いたします」と明確に述べて入室します。椅子の横で一礼し、面接官に着席を促されてから「失礼いたします」と言って座ります。',
    },
    {
      title: '結論ファースト (Conclusion First Principle)',
      desc: '質問に対して「はい、結論から申し上げますと〜です」と回答の骨子を最初に提示し、面接官が文脈を即座に把握できるように配慮します。',
    },
    {
      title: 'アイコンタクトと表情 (Eye Contact & Poise)',
      desc: 'Web面接ではカメラレンズを適度に見つめることで、面接官と自然な視線を合わせます。相手の話を聞く際は小さく頷く（相づち）ことが好印象に繋がります。',
    },
  ];

  const keigoTips = [
    {
      wrong: '私の言った通り (As I said)',
      correct: '先ほど申し上げました通り (As I mentioned earlier)',
      note: '自己の動作を低める謙譲語を使用します。',
    },
    {
      wrong: '御社の社長が言いました (Your president said)',
      correct: '貴社の社長様がおっしゃいました (Your president stated)',
      note: '相手側の動作には尊敬語を用います。',
    },
    {
      wrong: '了解しました (Understood - casual)',
      correct: 'かしこまりました / 承知いたしました (Understood - polite)',
      note: '「了解しました」は目上に対して避けるのが日本の就活の鉄則です。',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 select-none py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              STATIC GUIDE · NOT LIVE AI
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {uiLanguage === 'ja' ? '面接ガイド（静的コンテンツ）' : 'Interview Guide (Static Content)'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {uiLanguage === 'ja'
              ? 'このページは固定の学習ガイドです。ライブAIメンターAPIには接続していません。'
              : 'This page is a fixed study guide. It is not connected to a live AI mentor API.'}
          </p>
        </div>

        <NeonButton
          onClick={() => navigate('/career/interview/setup')}
          icon={<Sparkles className="w-4 h-4" />}
        >
          {uiLanguage === 'ja' ? '実践面接を試す' : 'Practice in Mock Room'}
        </NeonButton>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/80 border border-[#E2EEF8] shadow-2xs max-w-md">
        <button
          onClick={() => setActiveTab('manners')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'manners'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {uiLanguage === 'ja' ? '面接マナー' : 'Manners & Etiquette'}
        </button>
        <button
          onClick={() => setActiveTab('keigo')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'keigo'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {uiLanguage === 'ja' ? '頻出敬語' : 'Keigo Expressions'}
        </button>
        <button
          onClick={() => setActiveTab('star')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'star'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {uiLanguage === 'ja' ? 'STAR回答術' : 'STAR Method'}
        </button>
      </div>

      {/* Content based on Tab */}
      {activeTab === 'manners' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mannersTips.map((tip, idx) => (
            <GlassCard key={idx} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                0{idx + 1}
              </div>
              <h3 className="font-bold text-base text-slate-800">{tip.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{tip.desc}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === 'keigo' && (
        <div className="space-y-3">
          {keigoTips.map((k, idx) => (
            <GlassCard key={idx} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">NG</span>
                  <span className="text-xs font-semibold text-slate-400 line-through">{k.wrong}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">OK</span>
                  <span className="text-sm font-bold text-slate-900">{k.correct}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 md:max-w-xs">{k.note}</div>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === 'star' && (
        <GlassCard className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              STAR
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">STAR Method for Technical Interviews</h3>
              <p className="text-xs text-slate-500">
                How to structure your answers logically to impress Japanese engineering managers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1.5">
              <div className="font-black text-blue-700 text-base">S — Situation (状況)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Describe the specific project context, tech stack, and what circumstances led to the challenge.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-1.5">
              <div className="font-black text-cyan-700 text-base">T — Task (課題)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Define the concrete problem (e.g. race condition, latency bottleneck, team coordination issue).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
              <div className="font-black text-indigo-700 text-base">A — Action (行動)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explain YOUR technical decisions, debugging steps, algorithms, or architectural patterns used.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
              <div className="font-black text-emerald-700 text-base">R — Result (成果)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Highlight quantifiable outcomes (e.g. 42% latency reduction, 0 double allocations, positive review).
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
