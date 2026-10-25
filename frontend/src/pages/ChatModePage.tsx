import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TronLogo } from '../components/common/TronLogo';
import { GlassCard } from '../components/common/GlassCard';
import { MarkdownContent } from '../components/common/MarkdownContent';
import { AiProfileSelector } from '../components/common/AiProfileSelector';
import {
  Send,
  Paperclip,
  ArrowUp,
  Loader2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Search,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const starterPrompts = [
    {
      title: 'Python / Algorithm Coding',
      subtitle: 'Complete Python solutions with docstrings and tests',
      prompt: 'Write a Python script that checks if a string is a palindrome, with type annotations and doctests.',
    },
    {
      title: 'FastAPI Backend Architecture',
      subtitle: 'Modern REST API endpoints and data validation',
      prompt: 'Show how to create a high-performance FastAPI service with health check and validation.',
    },
    {
      title: 'Japanese Self-Introduction',
      subtitle: '自己紹介の添削と面接改善アドバイス',
      prompt: 'Please review my Japanese self-introduction for a software engineer role in Tokyo.',
    },
    {
      title: 'STAR Method Framing',
      subtitle: '技術課題（STAR）の論理的回答構築',
      prompt: 'How should I explain a database race condition using the STAR methodology?',
    },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages.length, isChatSending]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isChatSending) return;

    setInput('');
    await sendChatMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Message copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addToast(`Attached: ${file.name}. Chat file ingestion ready.`, 'info');
    }
  };

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
    <div className="relative flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full h-[calc(100vh-6rem)] select-none">
      {/* Backend connection banner if offline */}
      {backendStatus === 'offline' && (
        <div className="mb-2 p-2.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>TRON Core Offline:</strong> Service not detected at localhost:8080.
              Please start the Spring Boot backend service.
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-md">
            127.0.0.1:8080
          </span>
        </div>
      )}

      {/* Chat Session Header */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/70 border border-[#E2EEF8] backdrop-blur-md mb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[240px] md:max-w-md">
            {activeSession?.title || 'New Conversation'}
          </span>
          {activeSession?.modelDisplayName && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline">
              {activeSession.modelDisplayName}
            </span>
          )}
        </div>
        {isLocked && (
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-1">
            <span>Session locked</span>
          </span>
        )}
      </div>

      {/* Main Chat Conversation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {activeChatMessages.length === 0 ? (
          /* Empty State: Centered Hero with Prompt Starters */
          <div className="h-full flex flex-col items-center justify-center text-center my-auto px-4 py-6">
            <TronLogo size="xl" showGlow className="mb-3" />
            <h1 className="font-display text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              TRON AI <span className="text-[#008CFF]">Chat</span>
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500 max-w-md leading-relaxed">
              {uiLanguage === 'ja'
                ? '日本語・英語・シンハラ語・ベンガル語・ネパール語・ミャンマー語での技術相談、コード生成、面接アドバイスに対応します。'
                : 'Full-length code generation, Japanese career guidance, and multi-language AI intelligence.'}
            </p>

            {/* Starter Suggestion Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-8 text-left">
              {starterPrompts.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(s.prompt);
                    textareaRef.current?.focus();
                  }}
                  className="p-3.5 rounded-2xl bg-white/80 border border-[#E2EEF8] hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors">
                      {s.title}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List Thread */
          activeChatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="shrink-0 mt-1">
                  <TronLogo size="sm" showGlow={false} />
                </div>
              )}

              <div
                className={`group relative p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] md:max-w-[85%] ${
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
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5 text-[10px] opacity-70">
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
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:underline transition-opacity ml-3"
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
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <TronLogo size="sm" showGlow />
            <div className="p-3.5 rounded-2xl bg-white border border-[#E2EEF8] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>TRON AI is generating response (up to 1,536 tokens)...</span>
            </div>
          </div>
        )}

        {chatNotice && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{chatNotice}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Floating Input Bar */}
      <div className="shrink-0 pt-2">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] shadow-lg shadow-blue-500/8 px-4 py-2 transition-all focus-within:border-[#008CFF] focus-within:ring-2 focus-within:ring-blue-500/20 gap-2"
        >
          {/* File Attachment */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileAttach}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/70 rounded-full transition-colors shrink-0"
            title="Attach file"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* AI Model Selector (ChatGPT style) */}
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
            className="shrink-0"
          />

          {/* Search Mode Pill Control */}
          <button
            type="button"
            onClick={cycleSearchMode}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all border shrink-0 ${
              searchMode === 'on'
                ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                : searchMode === 'auto'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={`Web Search Mode: ${searchMode.toUpperCase()} (Click to toggle Off / Auto / On)`}
          >
            <Search className="w-3 h-3" />
            <span className="hidden sm:inline">Search:</span>
            <span>{searchMode.toUpperCase()}</span>
          </button>

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholderText()}
            className="flex-1 bg-transparent border-none outline-none px-2 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 resize-none max-h-32"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || isChatSending}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#008CFF] to-[#0066FF] text-white flex items-center justify-center shadow-md shadow-blue-500/25 hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 ml-1"
            title="Send"
          >
            {isChatSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 mt-2">
          TRON AI Chat supports up to 1,536 coding tokens. Code fences and syntax highlighting are rendered automatically.
        </p>
      </div>
    </div>
  );
};
