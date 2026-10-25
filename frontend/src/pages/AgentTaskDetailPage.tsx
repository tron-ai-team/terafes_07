import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { agentRealtimeClient } from '../services/agentRealtimeClient';
import {
  AgentTask,
  AgentRealtimeEvent,
  AgentApproval,
  AgentConversationMessage,
} from '../types/desktopAgent';
import { AgentStatusBadge } from '../components/agent/AgentStatusBadge';
import { AgentExecutionTrace } from '../components/agent/AgentExecutionTrace';
import { AgentTerminalPanel } from '../components/agent/AgentTerminalPanel';
import { AgentChangedFilesPanel } from '../components/agent/AgentChangedFilesPanel';
import { AgentBrowserPanel } from '../components/agent/AgentBrowserPanel';
import { AgentApprovalCard } from '../components/agent/AgentApprovalCard';
import { AgentConversationThread } from '../components/agent/AgentConversationThread';
import { AgentMessageComposer } from '../components/agent/AgentMessageComposer';
import { useApp } from '../context/AppContext';
import {
  Terminal,
  Laptop,
  Pause,
  Play,
  Square,
  UserCheck,
  ArrowLeft,
  RefreshCw,
  FolderCode,
  Clock,
  Eye,
  AlertTriangle,
  Code2,
  Globe,
  ListOrdered,
  MessageSquare,
  Activity,
  Cpu,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

// Explicitly marked Preview Data strictly for visual UI evaluation when backend is offline
const MOCK_PREVIEW_TASK: AgentTask = {
  id: 'preview-sample-01',
  goal: 'Inspect this Spring project and fix the build.',
  workspace: 'C:\\Dev\\demo-project',
  controlMode: 'AGENT',
  title: 'Inspect this Spring project and fix the build',
  prompt: 'Inspect this Spring project and fix the build.',
  deviceId: 'thushan-pc-01',
  deviceName: 'Thushan-PC',
  workspacePath: 'C:\\Dev\\demo-project',
  aiProfile: 'QUALITY',
  status: 'COMPLETED',
  currentStep: 'Build verified successfully',
  startedAt: '21:30:02',
  duration: '3m 45s',
  steps: [
    {
      id: 'step-1',
      title: 'Inspect workspace',
      status: 'completed',
      safeSummary: 'Scanned directory structure and identified Maven pom.xml target.',
    },
    {
      id: 'step-2',
      title: 'Analyze dependency tree',
      status: 'completed',
      safeSummary: 'Identified version incompatibility in spring-boot-starter-web.',
    },
    {
      id: 'step-3',
      title: 'Update pom.xml',
      status: 'completed',
      safeSummary: 'Patched dependency versions in pom.xml.',
    },
    {
      id: 'step-4',
      title: 'Run Maven tests',
      status: 'completed',
      safeSummary: 'Executed "mvn clean test" in host terminal.',
    },
    {
      id: 'step-5',
      title: 'Verify build',
      status: 'completed',
      safeSummary: 'Verified 0 test failures and compiled classes.',
    },
  ],
  terminalLogs: [
    {
      timestamp: '21:30:02',
      stream: 'system',
      text: '[TRON] Connected to Desktop Agent on Thushan-PC. Allowed workspace: C:\\Dev\\demo-project',
    },
    {
      timestamp: '21:30:10',
      stream: 'stdout',
      text: '[INFO] Scanning for projects...',
    },
    {
      timestamp: '21:30:25',
      stream: 'stdout',
      text: '[INFO] Running com.tron.demo.ApplicationTests',
    },
    {
      timestamp: '21:30:40',
      stream: 'stdout',
      text: '[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0\n[INFO] BUILD SUCCESS',
    },
  ],
  filesChanged: [
    {
      path: 'pom.xml',
      changeType: 'modified',
      linesAdded: 3,
      linesRemoved: 1,
      diff: `@@ -45,3 +45,5 @@\n-    <version>3.1.0</version>\n+    <version>3.2.4</version>\n+    <!-- resolved dependency conflict -->`,
    },
  ],
  browser: {
    currentUrl: 'http://localhost:8080',
    pageTitle: 'TRON Application Home',
    browserStatus: 'idle',
    detail: 'Verified application port responsive',
  },
  approvals: [],
};

const MOCK_PREVIEW_MESSAGES: AgentConversationMessage[] = [
  {
    id: 'm-1',
    sender: 'user',
    content: 'Inspect this Spring project and fix the build.',
    timestamp: '21:30:02',
  },
  {
    id: 'm-2',
    sender: 'assistant',
    content: "I'm inspecting the workspace now...",
    timestamp: '21:30:05',
  },
  {
    id: 'm-3',
    sender: 'assistant',
    content: 'I found a dependency issue in pom.xml.',
    timestamp: '21:30:15',
  },
  {
    id: 'm-4',
    sender: 'tool',
    toolType: 'file',
    content: 'pom.xml dependency version updated',
    safeSummary: 'pom.xml modified',
    toolPayload: {
      path: 'pom.xml',
      changeType: 'modified',
      linesAdded: 3,
      linesRemoved: 1,
      diff: '+ <version>3.2.4</version>\n+ <!-- resolved dependency conflict -->',
    },
    timestamp: '21:30:20',
  },
  {
    id: 'm-5',
    sender: 'assistant',
    content: "I've updated it. Running Maven tests now.",
    timestamp: '21:30:22',
  },
  {
    id: 'm-6',
    sender: 'tool',
    toolType: 'terminal',
    content: 'BUILD SUCCESS',
    safeSummary: '> mvnw test',
    toolPayload: {
      command: 'mvnw test',
      output: 'BUILD SUCCESS',
      fullOutput: '[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0\n[INFO] BUILD SUCCESS\n[INFO] Total time:  14.281 s',
    },
    timestamp: '21:30:40',
  },
  {
    id: 'm-7',
    sender: 'assistant',
    content: 'The build is fixed. I also found one warning.\nWould you like me to fix it?',
    timestamp: '21:30:45',
  },
  {
    id: 'm-8',
    sender: 'user',
    content: 'Yes. Fix that too.',
    timestamp: '21:31:00',
  },
  {
    id: 'm-9',
    sender: 'assistant',
    content: 'Continuing with the same task...',
    timestamp: '21:31:02',
  },
];

export const AgentTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedAiMode } = useApp();

  const [task, setTask] = useState<AgentTask | null>(null);
  const [messages, setMessages] = useState<AgentConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'terminal' | 'files' | 'browser' | 'trace'>('terminal');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isUiPreviewMode, setIsUiPreviewMode] = useState<boolean>(false);

  // Fetch task from real backend
  const fetchTask = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await desktopAgentClient.getTask(id);
      if (data) {
        setTask(data);
        setIsUiPreviewMode(false);

        // Seed initial conversation messages from task goal & summary
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          const initialMsgs: AgentConversationMessage[] = [
            {
              id: `msg-goal-${data.id}`,
              sender: 'user',
              content: data.goal || data.prompt || 'Inspect workspace and execute task.',
              timestamp: data.startedAt || new Date().toLocaleTimeString(),
            },
            {
              id: `msg-ack-${data.id}`,
              sender: 'assistant',
              content: data.summary || "I'm inspecting the workspace now...",
              timestamp: data.startedAt || new Date().toLocaleTimeString(),
            },
          ];
          setMessages(initialMsgs);
        }
      } else {
        setTask(null);
      }
    } catch (err: any) {
      console.warn('Real desktop agent backend task not found or offline:', err.message);
      setTask(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();

    if (!id) return;

    // Centralized real-time listener subscription (authenticated fetch SSE)
    const unsubscribe = agentRealtimeClient.subscribeTask(id, (event: AgentRealtimeEvent) => {
      setTask((prev) => {
        if (!prev) return prev;
        switch (event.type) {
          case 'TASK_STATUS':
            return {
              ...prev,
              status: (event.payload.status || prev.status) as any,
              controlMode: (event.payload.controlMode || prev.controlMode) as any,
              summary: event.payload.summary ?? prev.summary,
            };

          case 'TASK_COMPLETED':
            return {
              ...prev,
              status: 'COMPLETED',
              controlMode: (event.payload.controlMode || prev.controlMode) as any,
              summary: event.payload.summary ?? prev.summary,
              finalResult: { success: true, summary: event.payload.summary || 'Task completed successfully.' },
            };

          case 'TASK_FAILED':
            return {
              ...prev,
              status: 'FAILED',
              controlMode: (event.payload.controlMode || prev.controlMode) as any,
              summary: event.payload.summary ?? prev.summary,
              finalResult: { success: false, summary: event.payload.summary || 'Task failed.' },
            };

          case 'STEP_STARTED': {
            const stepSummary = event.payload.summary || 'Step in progress';
            const actionId = String(event.payload.actionId || `step-${Date.now()}`);
            const existingIndex = prev.steps.findIndex((s) => s.id === actionId);
            const updatedSteps = [...prev.steps];
            if (existingIndex >= 0) {
              updatedSteps[existingIndex] = {
                ...updatedSteps[existingIndex],
                status: 'running',
                title: stepSummary,
                summary: stepSummary,
                safeSummary: stepSummary,
              };
            } else {
              updatedSteps.push({
                id: actionId,
                title: stepSummary,
                summary: stepSummary,
                safeSummary: stepSummary,
                status: 'running',
              });
            }
            return {
              ...prev,
              currentStep: stepSummary,
              steps: updatedSteps,
              status: (event.payload.status || prev.status) as any,
              controlMode: (event.payload.controlMode || prev.controlMode) as any,
            };
          }

          case 'STEP_COMPLETED': {
            const stepSummary = event.payload.summary || 'Step completed';
            const actionId = String(event.payload.actionId || `step-${Date.now()}`);
            const existingIndex = prev.steps.findIndex((s) => s.id === actionId);
            const updatedSteps = [...prev.steps];
            if (existingIndex >= 0) {
              updatedSteps[existingIndex] = {
                ...updatedSteps[existingIndex],
                status: 'completed',
                title: stepSummary,
                summary: stepSummary,
                safeSummary: stepSummary,
              };
            } else {
              updatedSteps.push({
                id: actionId,
                title: stepSummary,
                summary: stepSummary,
                safeSummary: stepSummary,
                status: 'completed',
              });
            }
            return {
              ...prev,
              steps: updatedSteps,
              status: (event.payload.status || prev.status) as any,
              controlMode: (event.payload.controlMode || prev.controlMode) as any,
            };
          }

          case 'TERMINAL_OUTPUT': {
            const text = event.payload.chunk || '';
            const stream = (event.payload.stream || 'stdout') as 'stdout' | 'stderr' | 'system';
            const logEntry = {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: new Date().toLocaleTimeString(),
              stream,
              text,
            };
            return {
              ...prev,
              terminalLogs: [...prev.terminalLogs, logEntry],
            };
          }

          case 'FILE_CHANGED': {
            const p = event.payload;
            const newFileChange = {
              path: p.path,
              changeType: (p.changeType || 'modified').toLowerCase() as any,
              sha256: p.sha256,
              sizeBytes: p.sizeBytes,
            };
            const existingIndex = prev.filesChanged.findIndex((f) => f.path === p.path);
            const updatedFiles = [...prev.filesChanged];
            if (existingIndex >= 0) {
              updatedFiles[existingIndex] = newFileChange;
            } else {
              updatedFiles.push(newFileChange);
            }
            return {
              ...prev,
              filesChanged: updatedFiles,
            };
          }

          case 'APPROVAL_REQUIRED': {
            const a = event.payload;
            const approval: AgentApproval = {
              id: String(a.id),
              taskId: a.taskId ? String(a.taskId) : prev.id,
              deviceId: a.deviceId,
              actionId: a.actionId,
              fingerprint: a.fingerprint,
              risk: a.risk || 'Medium',
              summary: a.summary,
              action: a.commandPreview || a.pathPreview || a.summary || 'Operation',
              reason: a.summary || 'Requires explicit human confirmation',
              commandPreview: a.commandPreview,
              pathPreview: a.pathPreview,
              command: a.commandPreview,
              targetPath: a.pathPreview,
              status: 'PENDING',
              requestedAt: a.createdAt || new Date().toISOString(),
              expiresAt: a.expiresAt,
            };
            const filtered = prev.approvals.filter((existing) => existing.id !== approval.id);
            return {
              ...prev,
              status: 'WAITING_APPROVAL',
              approvals: [...filtered, approval],
            };
          }

          case 'APPROVAL_GRANTED': {
            const approvalId = String(event.payload.id || event.payload.approvalId);
            return {
              ...prev,
              status: prev.status === 'WAITING_APPROVAL' ? 'RUNNING' : prev.status,
              approvals: prev.approvals.map((a) =>
                a.id === approvalId
                  ? { ...a, status: 'APPROVED' as const, decidedAt: new Date().toISOString() }
                  : a
              ),
            };
          }

          case 'APPROVAL_DENIED': {
            const approvalId = String(event.payload.id || event.payload.approvalId);
            return {
              ...prev,
              approvals: prev.approvals.map((a) =>
                a.id === approvalId
                  ? { ...a, status: 'DENIED' as const, decidedAt: new Date().toISOString() }
                  : a
              ),
            };
          }

          case 'BROWSER_EVENT': {
            const b = event.payload;
            return {
              ...prev,
              browser: {
                currentUrl: b.url,
                pageTitle: b.title,
                browserStatus: b.event,
                screenshotBase64: b.screenshotBase64,
                event: b.event,
                detail: b.detail,
                actionId: b.actionId,
                timestamp: new Date().toLocaleTimeString(),
              },
            };
          }

          case 'WAITING_USER': {
            return {
              ...prev,
              status: 'WAITING_USER',
            };
          }

          default:
            return prev;
        }
      });

      // Handle conversational message events
      switch (event.type) {
        case 'AGENT_MESSAGE_STARTED': {
          const msgId = event.payload.messageId || `msg-agent-${Date.now()}`;
          setMessages((prev) => {
            // Deduplicate if messageId already exists
            if (prev.some((m) => m.id === msgId)) return prev;
            return [
              ...prev,
              {
                id: msgId,
                sender: 'assistant',
                content: event.payload.text || '',
                timestamp: new Date().toLocaleTimeString(),
                streaming: true,
              },
            ];
          });
          break;
        }

        case 'AGENT_MESSAGE_DELTA': {
          const delta = event.payload.delta ?? event.payload.text ?? '';
          setMessages((prev) => {
            const idx = [...prev].reverse().findIndex((m) => m.sender === 'assistant' && m.streaming);
            if (idx < 0) {
              return [
                ...prev,
                {
                  id: `msg-agent-${Date.now()}`,
                  sender: 'assistant',
                  content: delta,
                  timestamp: new Date().toLocaleTimeString(),
                  streaming: true,
                },
              ];
            }
            const targetIndex = prev.length - 1 - idx;
            const updated = [...prev];
            updated[targetIndex] = {
              ...updated[targetIndex],
              content: updated[targetIndex].content + delta,
            };
            return updated;
          });
          break;
        }

        case 'AGENT_MESSAGE_COMPLETED': {
          setMessages((prev) => {
            const idx = [...prev].reverse().findIndex((m) => m.sender === 'assistant' && m.streaming);
            if (idx < 0) {
              const text = event.payload.text || '';
              if (text && prev.some((m) => m.sender === 'assistant' && m.content === text)) {
                return prev;
              }
              return prev;
            }
            const targetIndex = prev.length - 1 - idx;
            const updated = [...prev];
            updated[targetIndex] = {
              ...updated[targetIndex],
              content: event.payload.text ?? updated[targetIndex].content,
              streaming: false,
            };
            return updated;
          });
          break;
        }

        case 'WAITING_USER': {
          setMessages((prev) => {
            const waitContent =
              event.payload.summary ||
              'User Action Required: Complete login, MFA, or CAPTCHA manually. Do not send your password in TRON chat.';
            if (prev.some((m) => m.content === waitContent)) return prev;
            return [
              ...prev,
              {
                id: `msg-wait-${Date.now()}`,
                sender: 'assistant',
                content: waitContent,
                timestamp: new Date().toLocaleTimeString(),
              },
            ];
          });
          break;
        }

        case 'FILE_CHANGED': {
          const f = event.payload;
          setMessages((prev) => [
            ...prev,
            {
              id: `tool-file-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              sender: 'tool',
              toolType: 'file',
              content: `Modified ${f.path}`,
              safeSummary: `${f.path}`,
              toolPayload: f,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
          break;
        }

        case 'TASK_COMPLETED': {
          setMessages((prev) => {
            const completedContent = event.payload.summary || 'Task completed successfully. What would you like me to do next?';
            if (prev.some((m) => m.sender === 'assistant' && (m.content === completedContent || m.content.includes('Task completed')))) {
              return prev;
            }
            return [
              ...prev,
              {
                id: `msg-completed-${Date.now()}`,
                sender: 'assistant',
                content: completedContent,
                timestamp: new Date().toLocaleTimeString(),
              },
            ];
          });
          break;
        }

        case 'TASK_FAILED': {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-failed-${Date.now()}`,
              sender: 'assistant',
              content: event.payload.summary || 'Task encountered an issue. Would you like me to diagnose and retry?',
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  // Handle conversational continuation input: POST /api/v1/agent-tasks/{taskId}/messages
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !task) return;
    const userMsg: AgentConversationMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // If task was COMPLETED, PAUSED, or WAITING_USER, transition to active
    if (['COMPLETED', 'FAILED', 'STOPPED', 'PAUSED', 'WAITING_USER'].includes(task.status)) {
      setTask((prev) => (prev ? { ...prev, status: 'RUNNING', controlMode: 'AGENT' } : prev));
    }

    setIsSendingMessage(true);
    try {
      if (isUiPreviewMode) {
        // Simulated responsive preview response
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-agent-${Date.now()}`,
              sender: 'assistant',
              content: `Continuing task #${task.id}: "${text.trim()}". Workspace inspected and changes executed.`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }, 600);
        return;
      }

      // Real API Call: POST /api/v1/agent-tasks/{taskId}/messages
      await desktopAgentClient.sendTaskMessage(task.id, text.trim());
    } catch (err: any) {
      console.warn('sendTaskMessage response:', err.message);
      // Backend Contract Preparation: If endpoint not yet deployed, explain cleanly
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-sys-${Date.now()}`,
          sender: 'system',
          content: `[Backend Ready] POST /api/v1/agent-tasks/${task.id}/messages is not yet deployed on Spring Boot (${err.message}). Instruction recorded in conversation thread. Once the Cuser endpoint is enabled, instructions will dispatch directly to the agent.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Task Control Handlers
  const handlePause = async () => {
    if (!task) return;
    setIsActionLoading(true);
    try {
      if (isUiPreviewMode) {
        setTask({ ...task, status: 'PAUSED' });
        return;
      }
      await desktopAgentClient.pauseTask(task.id);
      setTask({ ...task, status: 'PAUSED' });
    } catch (err: any) {
      alert(`Pause action failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!task) return;
    setIsActionLoading(true);
    try {
      if (isUiPreviewMode) {
        setTask({ ...task, status: 'RUNNING', controlMode: 'AGENT' });
        return;
      }
      await desktopAgentClient.resumeTask(task.id);
      setTask({ ...task, status: 'RUNNING', controlMode: 'AGENT' });
    } catch (err: any) {
      alert(`Resume action failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to stop this task?')) return;
    setIsActionLoading(true);
    try {
      if (isUiPreviewMode) {
        setTask({ ...task, status: 'STOPPED' });
        return;
      }
      await desktopAgentClient.stopTask(task.id);
      setTask({ ...task, status: 'STOPPED' });
    } catch (err: any) {
      alert(`Stop action failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTakeControl = async () => {
    if (!task) return;
    setIsActionLoading(true);
    try {
      if (isUiPreviewMode) {
        setTask({ ...task, status: 'PAUSED', controlMode: 'MANUAL' });
        return;
      }
      await desktopAgentClient.takeControl(task.id);
      setTask({ ...task, status: 'PAUSED', controlMode: 'MANUAL' });
    } catch (err: any) {
      alert(`Take control action failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Approval Handlers
  const handleApprove = async (approvalId: string) => {
    if (!task) return;
    if (isUiPreviewMode) {
      setTask({
        ...task,
        status: 'RUNNING',
        approvals: task.approvals.map((a) =>
          a.id === approvalId ? { ...a, status: 'APPROVED' as const } : a
        ),
      });
      return;
    }
    await desktopAgentClient.approveAction(task.id, approvalId);
    setTask({
      ...task,
      status: 'RUNNING',
      approvals: task.approvals.map((a) =>
        a.id === approvalId ? { ...a, status: 'APPROVED' as const } : a
      ),
    });
  };

  const handleDeny = async (approvalId: string) => {
    if (!task) return;
    if (isUiPreviewMode) {
      setTask({
        ...task,
        approvals: task.approvals.map((a) =>
          a.id === approvalId ? { ...a, status: 'DENIED' as const } : a
        ),
      });
      return;
    }
    await desktopAgentClient.denyAction(task.id, approvalId);
    setTask({
      ...task,
      approvals: task.approvals.map((a) =>
        a.id === approvalId ? { ...a, status: 'DENIED' as const } : a
      ),
    });
  };

  // Switch to UI preview for visual review
  const enableUiPreview = () => {
    setIsUiPreviewMode(true);
    setTask(MOCK_PREVIEW_TASK);
    setMessages(MOCK_PREVIEW_MESSAGES);
  };

  if (isLoading && !task) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Connecting to TRON Conversational Agent console...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Task Not Found on Desktop Backend</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No live task with ID <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{id}</code> was returned by the Spring Boot backend.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/workspace/agent"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Coding Agent</span>
            </Link>

            <button
              onClick={enableUiPreview}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Launch Conversational UI Preview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeApproval = task.approvals?.find((a) => a.status === 'pending' || a.status === 'PENDING');
  const hasBrowserScreenshot = Boolean(task.browser?.screenshotBase64 && task.browser.screenshotBase64.trim().length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-in fade-in duration-300">
      {/* UI Preview Mode Banner */}
      {isUiPreviewMode && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
              UI PREVIEW ONLY
            </span>
            <span>
              Simulated conversational thread evaluating TRON Agent V2 Console UX.
            </span>
          </div>
          <button
            onClick={() => {
              setIsUiPreviewMode(false);
              fetchTask();
            }}
            className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 shrink-0"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Manual Control Banner */}
      {task.controlMode === 'MANUAL' && (
        <div className="p-4 rounded-3xl bg-purple-50 border border-purple-200 shadow-sm flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <div>
              <h4 className="font-bold text-purple-900">Agent Paused for Manual Control</h4>
              <p className="text-[11px] text-purple-700">
                TRON has yielded execution. You may inspect or modify files/browser directly. When finished, resume the agent.
              </p>
            </div>
          </div>
          <button
            onClick={handleResume}
            disabled={isActionLoading}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            RESUME AGENT
          </button>
        </div>
      )}

      {/* Task Header: Non-contradictory Status, Control Mode, Device, Workspace, Task ID */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/workspace/agent/tasks"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Back to Active Tasks"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Canonical Task Status Badge */}
            <AgentStatusBadge status={task.status} controlMode={task.controlMode} size="md" />

            <span className="font-mono text-xs font-bold text-slate-700">
              #{task.id}
            </span>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              <Laptop className="w-3.5 h-3.5 text-blue-500" />
              <span>{task.deviceName || task.deviceId}</span>
            </div>

            {/* Current AI Mode */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Mode: {task.aiProfile || selectedAiMode || 'SMART'}</span>
            </div>

            {/* Display non-contradictory elapsed time or state */}
            {task.status !== 'COMPLETED' && task.status !== 'VERIFIED' && task.status !== 'STOPPED' && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3 h-3" />
                <span>{task.duration || 'Active'}</span>
              </div>
            )}
          </div>

          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
            {task.goal || task.title || task.prompt || 'Conversational Coding Task'}
          </h1>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <FolderCode className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{task.workspace || task.workspacePath || 'No workspace specified'}</span>
          </div>
        </div>

        {/* Task Control Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          {task.status === 'RUNNING' && (
            <button
              onClick={handlePause}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </button>
          )}

          {task.status === 'WAITING_USER' && (
            <>
              {task.controlMode !== 'MANUAL' && (
                <button
                  onClick={handleTakeControl}
                  disabled={isActionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  title="Take control of the browser for manual login"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Take Browser Control</span>
                </button>
              )}
              <button
                onClick={handleResume}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Resume Agent</span>
              </button>
            </>
          )}

          {task.status === 'PAUSED' && (
            <button
              onClick={handleResume}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume Agent</span>
            </button>
          )}

          {task.status === 'RUNNING' && (
            <button
              onClick={handleTakeControl}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition-colors cursor-pointer"
              title="Pause agent and yield control to user"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Take Control</span>
            </button>
          )}

          {!['COMPLETED', 'FAILED', 'STOPPED'].includes(task.status) && (
            <button
              onClick={handleStop}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-rose-600" />
              <span>STOP</span>
            </button>
          )}
        </div>
      </div>

      {/* Outcome banner — VERIFIED only when backend status is VERIFIED; never decorate COMPLETED as verified. */}
      {task.status === 'VERIFIED' && !isUiPreviewMode && (
        <div className="p-4 rounded-3xl bg-emerald-50/90 border border-emerald-300 shadow-sm flex items-start gap-3.5 animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm text-emerald-950 font-display">
                Verified Outcome
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-200 text-emerald-900">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              {task.finalResult?.summary || task.summary || 'Goal verification passed with tool evidence.'}
            </p>
          </div>
        </div>
      )}
      {task.status === 'COMPLETED' && !isUiPreviewMode && (
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-700 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm text-slate-900 font-display">Task Completed</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-200 text-slate-800">
                COMPLETED
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {task.finalResult?.summary || task.summary || 'Task finished. Check steps and files for evidence.'}
            </p>
          </div>
        </div>
      )}
      {isUiPreviewMode && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          Demo UI preview only — not a live agent task.
        </div>
      )}

      {/* Main Console Split: Conversation (Primary) & Secondary Technical Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Conversational Thread + Persistent Composer (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Conversation Thread Area */}
          <AgentConversationThread
            messages={messages}
            status={task.status}
            controlMode={task.controlMode}
            activeApproval={activeApproval}
            onApprove={handleApprove}
            onDeny={handleDeny}
            onTakeControl={handleTakeControl}
            onResumeAgent={handleResume}
            onSelectTab={setActiveTab}
            onSendQuickReply={handleSendMessage}
          />

          {/* Persistent Bottom Composer */}
          <AgentMessageComposer
            onSendMessage={handleSendMessage}
            status={task.status}
            isSending={isSendingMessage}
          />
        </div>

        {/* Right Column: Secondary Technical Panels (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Secondary Tab Bar */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full overflow-x-auto text-xs font-semibold scrollbar-none">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'terminal'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-600" />
              <span>Terminal</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded-full">
                {task.terminalLogs?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'files'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Files</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded-full">
                {task.filesChanged?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('browser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'browser'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Browser</span>
              {hasBrowserScreenshot && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Screenshot available" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('trace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                activeTab === 'trace'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-slate-600" />
              <span>Trace</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded-full">
                {task.steps?.length || 0}
              </span>
            </button>
          </div>

          {/* Panel 1: Terminal */}
          {activeTab === 'terminal' && (
            <AgentTerminalPanel
              logs={task.terminalLogs || []}
              isStreaming={task.status === 'RUNNING'}
              title={`Terminal — ${task.deviceName || 'Desktop Agent'}`}
            />
          )}

          {/* Panel 2: Changed Files */}
          {activeTab === 'files' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <AgentChangedFilesPanel files={task.filesChanged || []} />
            </div>
          )}

          {/* Panel 3: Browser Verification */}
          {activeTab === 'browser' && (
            <AgentBrowserPanel
              browser={task.browser}
              controlMode={task.controlMode}
              isWaitingUser={task.status === 'WAITING_USER'}
              onTakeControl={handleTakeControl}
              onResumeAgent={handleResume}
            />
          )}

          {/* Panel 4: Execution Trace (Secondary) */}
          {activeTab === 'trace' && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
              <AgentExecutionTrace
                steps={task.steps || []}
                currentStepId={task.steps?.find((s) => s.status === 'running')?.id}
                hasBrowserScreenshot={hasBrowserScreenshot}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
