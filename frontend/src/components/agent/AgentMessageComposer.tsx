import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, ArrowUpRight } from 'lucide-react';
import { AgentTaskStatus } from '../../types/desktopAgent';

export interface AgentMessageComposerProps {
  onSendMessage: (message: string) => Promise<void> | void;
  status: AgentTaskStatus;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  'Continue',
  'Fix that too',
  'Now run the tests',
  'Open the app in browser',
  'Check the next error',
  'Use this browser session and continue',
];

export const AgentMessageComposer: React.FC<AgentMessageComposerProps> = ({
  onSendMessage,
  status,
  isSending = false,
  disabled = false,
  placeholder,
  className = '',
}) => {
  const [input, setInput] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending || disabled) return;
    const msg = input.trim();
    setInput('');
    onSendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isSending || disabled) return;
    onSendMessage(suggestion);
  };

  // Determine dynamic placeholder based on task status
  const computedPlaceholder =
    placeholder ||
    (status === 'COMPLETED'
      ? 'Task finished. Continue the thread (e.g. "Now run the tests", "Open in browser")...'
      : status === 'WAITING_USER'
      ? 'Reply to TRON (e.g. "done", "continue", "I logged in")...'
      : status === 'PAUSED'
      ? 'Agent paused. Type your next instruction to resume...'
      : status === 'FAILED'
      ? 'Task encountered an issue. Type instructions to retry or diagnose...'
      : 'Type your next instruction for TRON agent...');

  return (
    <div className={`p-4 rounded-3xl bg-white border border-slate-200 shadow-md space-y-3 ${className}`}>
      {/* Suggestions Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none text-[11px]">
        <div className="flex items-center gap-1 text-slate-400 font-bold shrink-0 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Suggestions:</span>
        </div>
        {DEFAULT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isSending || disabled}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-medium whitespace-nowrap transition-all shrink-0 border border-slate-200/80 hover:border-blue-200 cursor-pointer disabled:opacity-50"
          >
            <span>{suggestion}</span>
            <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
          </button>
        ))}
      </div>

      {/* Input Composer Box */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={computedPlaceholder}
          rows={1}
          disabled={disabled || isSending}
          className="flex-1 bg-transparent border-0 outline-none resize-none px-2 py-1 text-xs text-slate-800 placeholder-slate-400 font-medium leading-relaxed max-h-[120px]"
        />

        <button
          type="submit"
          disabled={!input.trim() || isSending || disabled}
          className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all shrink-0 ${
            input.trim() && !isSending && !disabled
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 cursor-pointer scale-100'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed scale-95'
          }`}
          title="Send instruction (Enter)"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Keyboard Hint & Status Note */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
        <span>Persistent Task Thread • Enter to send, Shift+Enter for new line</span>
        <span className="font-sans font-semibold text-slate-500">
          Status: <span className="font-mono text-blue-600">{status}</span>
        </span>
      </div>
    </div>
  );
};
