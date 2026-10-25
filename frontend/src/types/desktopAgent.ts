/**
 * TRON AI — Desktop Agent & Task Console Types
 */

export type DesktopAgentStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'REVOKED';

export type PermissionLevel = 'ALLOWED' | 'APPROVAL' | 'DENIED';

export interface DevicePermissions {
  readFiles: PermissionLevel;
  editFiles: PermissionLevel;
  terminal: PermissionLevel;
  git: PermissionLevel;
  browser: PermissionLevel;
  dangerousActions: PermissionLevel;
}

export interface DesktopAgentDevice {
  id: string | number;
  deviceUuid?: string;
  displayName: string;
  os: string;
  status: DesktopAgentStatus;
  lastSeen?: string;
  allowedWorkspace: string;
  agentVersion?: string;
  pairedAt?: string;
  revokedAt?: string;
  hostname?: string;
  fingerprint?: string;
  ipAddress?: string;
  permissions?: DevicePermissions;
}

export type AgentTaskStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'PLANNED'
  | 'RUNNING'
  | 'EXECUTING'
  | 'WAITING_APPROVAL'
  | 'WAITING_USER'
  | 'PAUSED'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'FAILED'
  | 'STOPPED';

export type AgentControlMode = 'AGENT' | 'MANUAL';

export interface AgentTaskStep {
  id: string;
  title: string;
  summary?: string;
  tool?: string;
  operation?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  safeSummary?: string;
}

export interface AgentTerminalEvent {
  id?: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
}

export interface AgentFileChange {
  path: string;
  changeType: 'created' | 'modified' | 'deleted';
  sha256?: string;
  sizeBytes?: number;
  diff?: string;
  originalContent?: string;
  newContent?: string;
  linesAdded?: number;
  linesRemoved?: number;
}

export interface AgentBrowserEvent {
  screenshotBase64?: string;
  screenshotUrl?: string;
  currentUrl?: string;
  pageTitle?: string;
  browserStatus?: string;
  event?: string;
  detail?: string;
  actionId?: string;
  timestamp?: string;
}

export interface AgentApproval {
  id: string;
  taskId?: string;
  deviceId?: string | number;
  actionId?: string;
  fingerprint?: string;
  action?: string;
  risk: string;
  reason?: string;
  summary?: string;
  commandPreview?: string;
  pathPreview?: string;
  command?: string;
  targetPath?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'pending' | 'approved' | 'denied';
  requestedAt?: string;
  decidedAt?: string;
  expiresAt?: string;
}

export type BrowserSessionStatus =
  | 'ACTIVE'
  | 'WAITING_USER'
  | 'AGENT_CONTROLLED'
  | 'USER_CONTROLLED'
  | 'CLOSED';

export interface AgentConversationMessage {
  id: string;
  sender: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  timestamp: string;
  streaming?: boolean;
  toolType?: 'terminal' | 'file' | 'browser' | 'approval';
  toolPayload?: any;
  safeSummary?: string;
}

export interface AgentTask {
  id: string;
  deviceId: string | number;
  goal: string;
  workspace?: string;
  status: AgentTaskStatus;
  controlMode?: AgentControlMode;
  summary?: string;
  deviceName?: string;
  currentStep?: string;
  steps: AgentTaskStep[];
  terminalLogs: AgentTerminalEvent[];
  filesChanged: AgentFileChange[];
  browser?: AgentBrowserEvent;
  browserSessionStatus?: BrowserSessionStatus;
  approvals: AgentApproval[];
  messages?: AgentConversationMessage[];
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  duration?: string;
  actionCount?: number;
  // UI backward-compatibility convenience accessors
  title?: string;
  prompt?: string;
  workspacePath?: string;
  aiProfile?: string;
  finalResult?: {
    success: boolean;
    summary: string;
  };
}

export type RealtimeEventType =
  | 'TASK_STATUS'
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'TERMINAL_OUTPUT'
  | 'FILE_CHANGED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'BROWSER_EVENT'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'DEVICE_STATUS'
  | 'AGENT_MESSAGE_STARTED'
  | 'AGENT_MESSAGE_DELTA'
  | 'AGENT_MESSAGE_COMPLETED'
  | 'WAITING_USER';

export interface AgentRealtimeEvent {
  type: RealtimeEventType;
  taskId?: string;
  deviceId?: string;
  payload: any;
  timestamp: string;
}


