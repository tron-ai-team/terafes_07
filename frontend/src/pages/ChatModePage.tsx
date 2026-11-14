import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TronLogo } from '../components/common/TronLogo';
import { GlassCard } from '../components/common/GlassCard';
import { MarkdownContent } from '../components/common/MarkdownContent';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import {
  Send,
  ArrowUp,
  Loader2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Paperclip,
  ChevronRight,
  Code2,
  Layers,
  Languages,
  Star,
  Lock,
} from 'lucide-react';

export const ChatModePage: React.FC = () => {
  const {
    activeChatMessages,
    isChatSending,
    chatNotice,
    sendChatMessage,
    createNewChat,
    uiLanguage,
    searchMode,
    setSearchMode,
    addToast,
    backendStatus,
    chatSessions,
    activeChatId,
    aiProfiles,
    updateSessionProfile,
    preferredAiProfile,
  } = useApp();

  const activeSession = chatSessions.find((s) => s.id === activeChatId) || chatSessions[0];
  const isLocked = (activeSession?.messages && activeSession.messages.length > 0) || !!activeSession?.locked;
  const currentProfile = activeSession?.aiProfile || preferredAiProfile;

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const starterPrompts = [
    {
      id: 'python',
      title: 'Python / Algorithm Coding',
      subtitleJa: 'Pythonの課題解決、ドキュメント、テストまで対応。',
      subtitleEn: 'Complete Python solutions with docstrings and tests',
      prompt: 'Write a Python script that checks if a string is a palindrome, with type annotations and doctests.',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-blue-500/20',
      icon: <Code2 className="w-4 h-4 stroke-[2.2]" />,
    },
    {
      id: 'fastapi',
      title: 'FastAPI Backend Architecture',
      subtitleJa: 'REST APIの設計、実装、データ検証の相談。',
      subtitleEn: 'Modern REST API endpoints and data validation',
      prompt: 'Show how to create a high-performance FastAPI service with health check and validation.',
      iconBg: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 text-white shadow-purple-500/20',
      icon: <Layers className="w-4 h-4 stroke-[2.2]" />,
    },
    {
      id: 'japanese',
      title: 'Japanese Self-Introduction',
      subtitleJa: '自己紹介の添削と面接改善アドバイス。',
      subtitleEn: 'Review and refine Japanese interview self-introduction',
      prompt: 'Please review my Japanese self-introduction for a software engineer role in Tokyo.',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-teal-500/20',
      icon: <Languages className="w-4 h-4 stroke-[2.2]" />,
    },
    {
      id: 'star',
      title: 'STAR Method Framing',
      subtitleJa: '技術課題（STAR）の論理的な回答構成。',
      subtitleEn: 'Structure technical interview answers with the STAR method',
      prompt: 'How should I explain a database race condition using the STAR methodology?',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-orange-500/20',
      icon: <Star className="w-4 h-4 stroke-[2.2]" />,
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages.length, isChatSending]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isChatSending) return;

    // Clear composer optimistically; restore on failure so the user never loses typed text.
    setInput('');
    const ok = await sendChatMessage(text);
    if (!ok) {
      setInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Japanese IME is currently composing (kanji conversion), do not submit
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      addToast(
        uiLanguage === 'ja' ? 'クリップボードにコピーしました' : 'Message copied to clipboard',
        'info',
      );
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast(
        uiLanguage === 'ja'
          ? 'コピーに失敗しました。手動で選択してコピーしてください。'
          : 'Copy failed. Select the text and copy manually.',
        'error',
      );
    }
  };

  const hasUserMessages = activeChatMessages.some((m) => m.role === 'user');
  const isInitialEmptyState =
    activeChatMessages.length === 0 ||
    (!hasUserMessages && activeChatMessages.every((m) => m.id === 'msg-welcome-ai'));

  const getPlaceholderText = () => {
    if (uiLanguage === 'ja') {
      return 'メッセージを入力してください... (Enterで送信, Shift+Enterで改行)';
    }
    return 'Message TRON AI... (Enter to send, Shift+Enter for new line)';
  };

  const cycleSearchMode = () => {
    const nextMode = searchMode === 'off' ? 'auto' : searchMode === 'auto' ? 'on' : 'off';
    setSearchMode(nextMode);
    addToast(`Web Search mode: ${nextMode.toUpperCase()}`, 'info');
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full h-full min-h-0 select-none">
      {/* Backend connection banner if offline */}
      {backendStatus === 'offline' && (
        <div className="mb-1.5 p-2 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs flex items-center justify-between gap-2 shadow-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="min-w-0 text-[11px] sm:text-xs">
              <strong>{uiLanguage === 'ja' ? '接続できません:' : 'Temporarily unavailable:'}</strong>{' '}
              {uiLanguage === 'ja'
                ? 'TRON AIに接続できません。しばらくしてからお試しください。'
                : 'TRON AI is temporarily unavailable. Please try again.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md hover:bg-amber-100 cursor-pointer"
          >
            {uiLanguage === 'ja' ? '再試行' : 'Retry'}
          </button>
        </div>
      )}

      {/* Desktop Chat Session Header (Title, Model ID, and Session Lock Indicator) */}
      <div className="hidden md:flex items-center justify-between px-4 py-2 rounded-2xl bg-white/60 border border-white/60 backdrop-blur-md mb-2 shrink-0 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {activeSession?.title || 'New Conversation'}
          </span>
          {activeSession?.modelDisplayName && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100/90 border border-slate-200/60 px-2 py-0.5 rounded-md truncate max-w-[130px]">
              {activeSession.modelDisplayName}
            </span>
          )}
        </div>
        {isLocked && (
          <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1 shrink-0">
            <span>Session locked</span>
            <Lock className="w-3 h-3 text-slate-400" />
          </span>
        )}
      </div>

      {/* Main Chat Conversation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2 space-y-3 min-h-0">
        {isInitialEmptyState ? (
          /* Empty State: Centered Hero with Prompt Starters matching reference mockup */
          <div className="h-full flex flex-col items-center justify-center text-center my-auto px-2 sm:px-4 py-2 sm:py-4">
            {/* Circular glowing TRON emblem */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 mb-2 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full bg-cyan-400/25 blur-lg pointer-events-none" />
              <div className="w-full h-full rounded-full border border-cyan-400/40 p-1 bg-gradient-to-b from-white/90 to-blue-50/80 shadow-md shadow-cyan-500/20 flex items-center justify-center">
                <img
                  src="/images/assets/tron-logo.png"
                  alt="TRON AI"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,180,255,0.5)]"
                />
              </div>
            </div>

            <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              TRON AI <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent">Chat</span>
            </h1>

            <p className="mt-1 text-[11px] sm:text-xs md:text-sm text-slate-500 max-w-sm sm:max-w-md leading-relaxed font-normal">
              {uiLanguage === 'ja'
                ? '日本語・英語・シンハラ語・ベンガル語・ネパール語・ミャンマー語での技術相談、コード生成、面接アドバイスに対応します。'
                : 'Technical consultation, code generation, and interview advice in Japanese, English, Sinhala, Bengali, Nepali, and Burmese.'}
            </p>

            {/* 2x2 Starter Suggestion Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full max-w-2xl mt-2.5 sm:mt-4 text-left">
              {starterPrompts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setInput(s.prompt);
                    textareaRef.current?.focus();
                  }}
                  className="p-2 sm:p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E2EEF8] hover:border-blue-300 hover:bg-blue-50/40 transition-all text-left group cursor-pointer shadow-xs active:scale-[0.98] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${s.iconBg}`}>
                      {s.icon}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500/70 shrink-0 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[10.5px] sm:text-xs text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {s.title}
                    </h3>
                    <p className="text-[9px] sm:text-[9.5px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                      {uiLanguage === 'ja' ? s.subtitleJa : s.subtitleEn}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List Thread */
          activeChatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 mt-1">
                  <TronLogo size="sm" showGlow={false} />
                </div>
              )}

              <div
                className={`group relative p-3 sm:p-4 rounded-2xl text-xs leading-relaxed max-w-[92%] sm:max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white/95 border border-[#E2EEF8] text-slate-800 shadow-xs'
                }`}
              >
                {/* Rich Markdown & Code Formatter */}
                <MarkdownContent
                  content={msg.content}
                  isUser={msg.role === 'user'}
                  truncated={msg.truncated}
                  finishReason={msg.finishReason}
                  search={msg.search}
                />

                {/* Message action controls */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5 text-[10px] opacity-75">
                  <div className="flex items-center gap-2">
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.language && (
                      <span className="uppercase text-[9px] font-mono bg-blue-50 text-blue-600 px-1 rounded">
                        {msg.language}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 text-slate-500 hover:text-blue-600 hover:underline transition-opacity ml-3 cursor-pointer"
                    title="Copy full message"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isChatSending && (
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-slate-500">
            <TronLogo size="sm" showGlow />
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-[#E2EEF8] flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-[11px] sm:text-xs">TRON AI is generating response (up to 1,536 tokens)...</span>
            </div>
          </div>
        )}

        {chatNotice && (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs">{chatNotice}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Floating Composer Area */}
      <div className="shrink-0 pt-1 pb-0.5 sm:pt-1.5 sm:pb-1">
        {/* Mobile Session Bar (Title, Model ID, and Session Lock Indicator) matching reference */}
        <div className="md:hidden flex items-center justify-between px-2 py-0.5 text-xs text-slate-600 mb-1 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]">
              {activeSession?.title || (uiLanguage === 'ja' ? '新しいチャット' : 'New Chat')}
            </span>
            {(activeSession?.modelDisplayName || activeSession?.modelId) && (
              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-600 text-[9.5px] font-mono border border-blue-200/60">
                {activeSession.modelDisplayName || activeSession.modelId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
            {isLocked ? (
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <span>Session locked</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </span>
            ) : (
              <span className="text-slate-400">Unlocked</span>
            )}
          </div>
        </div>

        {/* Mobile Floating controls row immediately above input (Model selector + Search mode) */}
        <div className="md:hidden flex items-center justify-between px-1 mb-1.5">
          {/* AI Model / Profile Selector */}
          <AiProfileSelector
            selectedProfile={currentProfile}
            onChange={(p) => {
              if (activeSession) {
                updateSessionProfile(activeSession.id, p);
              }
            }}
            locked={isLocked}
            availableProfiles={aiProfiles}
            placement="top"
            compact
            className="shrink-0"
          />

          {/* Web Search Mode Pill Control */}
          <button
            type="button"
            onClick={cycleSearchMode}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer shadow-2xs ${
              searchMode === 'on'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : searchMode === 'auto'
                ? 'bg-blue-50/90 text-blue-700 border-blue-200/90'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={`Web Search Mode: ${searchMode.toUpperCase()} (Click to toggle Off / Auto / On)`}
          >
            <Search className="w-3 h-3" />
            <span>Search: {searchMode.toUpperCase()}</span>
          </button>
        </div>

        {/* Input Box */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] shadow-lg shadow-blue-500/8 px-3 py-1 sm:p-2 transition-all focus-within:border-[#008CFF] focus-within:ring-2 focus-within:ring-blue-500/20 gap-1.5 sm:gap-2"
        >
          {/* Paperclip / attachment icon (Mobile only, matching reference) */}
          <button
            type="button"
            className="md:hidden text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1 cursor-default"
            aria-label="Attachments not supported"
            title="File attachments are currently unavailable"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Desktop in-bar AI Model Selector */}
          <div className="hidden md:block shrink-0">
            <AiProfileSelector
              selectedProfile={currentProfile}
              onChange={(p) => {
                if (activeSession) {
                  updateSessionProfile(activeSession.id, p);
                }
              }}
              locked={isLocked}
              availableProfiles={aiProfiles}
              compact
            />
          </div>

          {/* Desktop in-bar Search Mode Pill Control */}
          <button
            type="button"
            onClick={cycleSearchMode}
            className={`hidden md:flex px-2.5 py-1 rounded-full text-[10px] font-bold items-center gap-1.5 transition-all border shrink-0 cursor-pointer shadow-2xs ${
              searchMode === 'on'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : searchMode === 'auto'
                ? 'bg-blue-50/90 text-blue-700 border-blue-200/90'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={`Web Search Mode: ${searchMode.toUpperCase()} (Click to toggle Off / Auto / On)`}
          >
            <Search className="w-3 h-3" />
            <span>Search: {searchMode.toUpperCase()}</span>
          </button>

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            className="flex-1 min-w-0 bg-transparent border-none outline-none py-1 px-1 sm:px-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 resize-none max-h-28 leading-snug"
          />

          {/* Circular Submit Button with up arrow ↑ */}
          <button
            type="submit"
            disabled={!input.trim() || isChatSending}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#008CFF] to-[#0066FF] text-white flex items-center justify-center shadow-md shadow-blue-500/25 hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
            title="Send message"
          >
            {isChatSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </form>

        <p className="text-center text-[9px] sm:text-[10px] text-slate-400 mt-1 sm:mt-1.5 tracking-tight">
          TRON AI Chat supports up to 1,536 coding tokens. Code fences and syntax highlighting are rendered automatically.
        </p>
      </div>
    </div>
  );
};
