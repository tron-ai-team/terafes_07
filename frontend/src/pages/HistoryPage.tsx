import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { tronApi } from '../services/api';
import { authApi } from '../services/httpClient';
import { InterviewHistoryItem } from '../types/interview';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  RotateCcw,
  Calendar,
  Building2,
  Briefcase,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { uiLanguage, setInterviewConfig, addToast } = useApp();

  const [historyItems, setHistoryItems] = useState<InterviewHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    let isMounted = true;
    async function loadInterviews() {
      const localItems = tronApi.getInterviewHistory();
      try {
        const remote = await authApi.getInterviews();
        if (isMounted && Array.isArray(remote) && remote.length > 0) {
          const mapped: InterviewHistoryItem[] = remote.map((r: any) => ({
            id: r.id,
            date: r.completedAt
              ? new Date(r.completedAt).toLocaleDateString('ja-JP')
              : r.startedAt
              ? new Date(r.startedAt).toLocaleDateString('ja-JP')
              : new Date().toLocaleDateString('ja-JP'),
            companyName: r.companyName || 'LINEヤフー株式会社',
            jobPosition: r.jobPosition || 'Software Engineer',
            interviewType: r.interviewType || 'technical',
            difficulty: r.difficulty || 'intermediate',
            score: r.overallScore || 0,
            durationMinutes: 10,
            status: r.finished ? 'completed' : 'in-progress',
          }));
          const existingIds = new Set(mapped.map((m) => m.id));
          const combined = [...mapped, ...localItems.filter((li) => !existingIds.has(li.id))];
          setHistoryItems(combined);
          return;
        }
      } catch {
        // fallback
      }
      if (isMounted) setHistoryItems(localItems);
    }
    void loadInterviews();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = historyItems.filter((item) => {
    const matchSearch =
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jobPosition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter =
      filterType === 'all' || item.interviewType.toLowerCase().includes(filterType.toLowerCase());
    return matchSearch && matchFilter;
  });

  const handleRepeatInterview = (item: InterviewHistoryItem) => {
    setInterviewConfig((prev) => ({
      ...prev,
      companyName: item.companyName,
      jobPosition: item.jobPosition,
    }));
    addToast(`Repeating interview for ${item.companyName}...`, 'info');
    navigate('/career/interview/setup');
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 select-none py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {uiLanguage === 'ja' ? '面接履歴・過去セッション' : 'Interview History & Logs'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {uiLanguage === 'ja'
              ? '過去のAI模擬面接セッションのスコア推移、回答内容、および評価結果を確認できます。'
              : 'Review your past AI mock interview sessions, scores, and track your progress over time.'}
          </p>
        </div>

        <NeonButton
          onClick={() => navigate('/career/interview/setup')}
          icon={<Sparkles className="w-4 h-4" />}
        >
          {uiLanguage === 'ja' ? '新しい面接を始める' : 'Start New Session'}
        </NeonButton>
      </div>

      {/* Search and Filters Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder={
              uiLanguage === 'ja'
                ? '企業名や職種で検索...'
                : 'Search by company or job position...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-[#E2EEF8] focus:bg-white focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'technical', label: 'Technical' },
            { id: 'general', label: 'General' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-[#E2EEF8] text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* History Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <GlassCard className="p-12 text-center text-slate-500">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No interview sessions found</p>
            <p className="text-xs text-slate-400 mt-1">
              Start your first practice session to generate score records.
            </p>
          </GlassCard>
        ) : (
          filteredItems.map((item) => (
            <GlassCard
              key={item.id}
              hoverEffect
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start md:items-center gap-4">
                {/* Score badge */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/15 to-blue-500/20 border border-blue-200 flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-black text-blue-600 font-display">
                    {item.score}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 -mt-1">SCORE</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{item.companyName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {item.interviewType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {item.jobPosition}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.date}
                    </span>
                    <span>•</span>
                    <span>{item.durationMinutes} mins</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 self-end md:self-center">
                <button
                  onClick={() => handleRepeatInterview(item)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E2EEF8] text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                  <span>Repeat</span>
                </button>

                <button
                  onClick={() => navigate('/career/interview/feedback')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white text-xs font-semibold hover:brightness-105 transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1"
                >
                  <span>View Feedback</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};
