import React, { useEffect, useRef } from 'react';
import {
  AgentConversationMessage,
  AgentApproval,
  AgentControlMode,
  AgentTaskStatus,
} from '../../types/desktopAgent';
import { AgentToolCard } from './AgentToolCard';
import { AgentBrowserHandoffCard } from './AgentBrowserHandoffCard';
import { AgentApprovalCard } from './AgentApprovalCard';
import { Bot, User, Sparkles, Loader2, Info } from 'lucide-react';

export interface AgentConversationThreadProps {
  messages: AgentConversationMessage[];
  status: AgentTaskStatus;
  controlMode?: AgentControlMode;
  activeApproval?: AgentApproval;
  onApprove?: (approvalId: string) => Promise<void>;
  onDeny?: (approvalId: string) => Promise<void>;
  onTakeControl: () => void;
  onResumeAgent: () => void;
  onSelectTab: (tab: 'terminal' | 'files' | 'browser' | 'trace') => void;
  onSendQuickReply: (reply: string) => void;
  className?: string;
}

export const AgentConversationThread: React.FC<AgentConversationThreadProps> = ({
  messages,
  status,
  controlMode = 'AGENT',
  activeApproval,
  onApprove,
  onDeny,
  onTakeControl,
  onResumeAgent,
  onSelectTab,
  onSendQuickReply,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, activeApproval]);

  return (
    <div
      ref={scrollRef}
      className={`space-y-4 overflow-y-auto p-4 sm:p-5 rounded-3xl bg-slate-50/70 border border-slate-200/80 shadow-inner min-h-[420px] max-h-[620px] ${className}`}
    >
      {messages.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <Bot className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Thread Initializing...</p>
          <p className="text-[11px] text-slate-400">Waiting for agent workspace inspection.</p>
        </div>
      ) : (
        messages.map((msg) => {
          // 1. Tool Message Card
          if (msg.sender === 'tool' && msg.toolType) {
            return (
              <div key={msg.id} className="my-2 max-w-2xl">
                <AgentToolCard
                  toolType={msg.toolType}
                  title={msg.safeSummary || msg.content}
                  summary={msg.content}
                  payload={msg.toolPayload}
                  onOpenPanel={onSelectTab}
                />
              </div>
            );
          }

          // 2. System Notice Message
          if (msg.sender === 'system') {
            return (
              <div
                key={msg.id}
                className="my-2 p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 max-w-2xl"
              >
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-blue-700">System Information</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-mono whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          }

          // 3. User Message Bubble (Right aligned)
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex items-start justify-end gap-2.5 pl-8 sm:pl-16">
                <div className="space-y-1 text-right max-w-xl">
                  <div className="inline-block p-3.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm text-xs font-medium leading-relaxed text-left">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono pr-1">
                    {msg.timestamp}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              </div>
            );
          }

          // 4. TRON Assistant Message Bubble (Left aligned)
          return (
            <div key={msg.id} className="flex items-start gap-2.5 pr-8 sm:pr-16">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1 max-w-xl">
                <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-slate-200 shadow-xs text-xs text-slate-800 font-normal leading-relaxed space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-[11px] text-slate-900 flex items-center gap-1.5">
                      <span>TRON Assistant</span>
                      {msg.streaming && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Thinking & Working
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap font-sans text-slate-800">{msg.content}</p>

                  {/* Typing animation dots if currently streaming */}
                  {msg.streaming && (
                    <div className="flex items-center gap-1 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* 5. Inline WAITING_USER Browser Handoff Card */}
      {status === 'WAITING_USER' && (
        <div className="my-3 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AgentBrowserHandoffCard
            controlMode={controlMode}
            onTakeControl={onTakeControl}
            onResumeAgent={onResumeAgent}
            onOpenBrowserPanel={() => onSelectTab('browser')}
            onSendQuickReply={onSendQuickReply}
          />
        </div>
      )}

      {/* 6. Inline WAITING_APPROVAL Gatekeeper Card */}
      {activeApproval && status === 'WAITING_APPROVAL' && onApprove && onDeny && (
        <div className="my-3 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AgentApprovalCard
            approval={activeApproval}
            onApprove={onApprove}
            onDeny={onDeny}
          />
        </div>
      )}
    </div>
  );
};
