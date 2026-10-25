import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TronLogo } from '../components/common/TronLogo';
import { HUDCircle } from '../components/common/HUDCircle';
import { GlassCard } from '../components/common/GlassCard';
import { requestAssistantReply } from '../services/chatClient';
import {
  Compass,
  FileText,
  History,
  ArrowRight,
  Paperclip,
  ArrowUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { uiLanguage, addToast } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [chatStatus, setChatStatus] = useState<'idle' | 'sending' | 'notice'>('idle');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || chatStatus === 'sending') return;

    setChatStatus('sending');
    setStatusNotice(null);

    const result = await requestAssistantReply({
      sessionId: 'dash-chat-' + Date.now(),
      messages: [{ id: '1', role: 'user', content: query, createdAt: new Date().toISOString() }],
    });

    setChatStatus('idle');
    if (result.status === 'unavailable') {
      setStatusNotice(`${result.label}: ${result.detail}`);
    } else {
      addToast(result.detail || 'Message sent', 'info');
      setInputMessage('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addToast(`Selected CV file: ${file.name}. Navigating to CV Management...`, 'info');
      setTimeout(() => navigate('/career/cv'), 600);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between max-w-6xl mx-auto w-full py-4 select-none">
      {/* Top spacing */}
      <div className="h-2 md:h-6" />

      {/* Main Hero Section matching Reference Screenshot */}
      <div className="relative flex flex-col items-center justify-center text-center my-auto pt-1">
        {/* Animated HUD Circles and TRON Logo Centerpiece */}
        <div className="relative flex items-center justify-center mb-3 md:mb-4">
          <HUDCircle size={240} className="w-[200px] h-[200px] md:w-[240px] md:h-[240px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <TronLogo size="xl" showGlow />
          </div>
        </div>

        {/* Main Title matching reference: WHERE SHOULD YOUR JOURNEY BEGIN? */}
        <h1 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 uppercase">
          WHERE SHOULD YOUR{' '}
          <span className="bg-gradient-to-r from-[#008CFF] to-[#0066FF] bg-clip-text text-transparent drop-shadow-xs">
            JOURNEY
          </span>{' '}
          BEGIN?
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-xs md:text-sm text-slate-500 max-w-xl font-medium leading-relaxed">
          {uiLanguage === 'ja'
            ? 'AIと実践する日本の就職・転職面接。自信と合格を掴み取りましょう。'
            : 'Practice Japanese job interviews with AI and build your confidence.'}
        </p>

        {/* Three Action Cards matching Reference Screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-4xl mt-5 md:mt-7">
          {/* Card 1: Start AI Interview */}
          <GlassCard
            hoverEffect
            onClick={() => navigate('/career/interview/setup')}
            className="p-4 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                  {uiLanguage === 'ja' ? 'AI面接を始める' : 'Start AI Interview'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {uiLanguage === 'ja'
                    ? 'リアルな日本語面接をシミュレート'
                    : 'Practice a realistic Japanese interview.'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </GlassCard>

          {/* Card 2: Upload Your CV */}
          <GlassCard
            hoverEffect
            onClick={() => navigate('/career/cv')}
            className="p-4 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-50/80 border border-cyan-100 flex items-center justify-center text-cyan-600 group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-cyan-600 transition-colors">
                  {uiLanguage === 'ja' ? '履歴書・職務経歴書' : 'Upload Your CV'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {uiLanguage === 'ja'
                    ? '経歴に合わせて質問を個別最適化'
                    : 'Personalize questions using resume.'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </GlassCard>

          {/* Card 3: Interview History */}
          <GlassCard
            hoverEffect
            onClick={() => navigate('/career/history')}
            className="p-4 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {uiLanguage === 'ja' ? '面接履歴と分析' : 'Interview History'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {uiLanguage === 'ja'
                    ? '過去のスコアや改善点を確認'
                    : 'Review previous sessions & scores.'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </GlassCard>
        </div>
      </div>

      {/* Bottom Floating Input matching Reference Screenshot */}
      <div className="w-full max-w-3xl mx-auto mt-5 md:mt-6">
        {statusNotice && (
          <div className="mb-2.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-amber-600 hover:text-amber-800 font-bold ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="relative flex items-center rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] shadow-xl shadow-blue-500/8 px-4 py-2 transition-all focus-within:border-[#008CFF] focus-within:ring-2 focus-within:ring-blue-500/20"
        >
          {/* File Attachment Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/70 rounded-full transition-colors shrink-0"
            title="Attach CV or document"
          >
            <Paperclip className="w-5 h-5 rotate-45" />
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              uiLanguage === 'ja'
                ? '日本の面接や就活対策についてTRON AIに何でも質問してください...'
                : 'Ask TRON AI anything about Japanese interviews...'
            }
            className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-slate-800 placeholder:text-slate-400"
          />

          {/* Circular Blue Submit Button with Up Arrow */}
          <button
            type="submit"
            disabled={!inputMessage.trim() || chatStatus === 'sending'}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#008CFF] to-[#0066FF] text-white flex items-center justify-center shadow-md shadow-blue-500/30 hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 ml-1"
            title="Send Message"
          >
            {chatStatus === 'sending' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
          TRON AI is optimized for Japanese job interviews, keigo practice, and technical assessments.
        </p>
      </div>
    </div>
  );
};
