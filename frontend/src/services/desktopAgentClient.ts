import { apiFetch, parseErrorDetail } from './httpClient';
import {
  DesktopAgentDevice,
  AgentTask,
  AgentTaskStep,
  AgentTerminalEvent,
  AgentFileChange,
  AgentApproval,
  AgentTaskStatus,
  AgentControlMode,
} from '../types/desktopAgent';

/**
 * TRON AI — Desktop Agent API Client
 * Reconciled against the canonical Cuser Spring backend contract.
 */

const BASE_PREFIX = '/api/v1';

export interface CreateTaskPayload {
  deviceId: number | string;
  goal: string;
  workspace?: string;
  /** FAST / SMART / QUALITY / ULTRA / AUTO — locked for the task lifetime. */
  aiProfile?: string;
}

export function normalizeTask(raw: any): AgentTask {
  if (!raw) return raw;

  const steps: AgentTaskStep[] = Array.isArray(raw.steps)
    ? raw.steps.map((s: any) => ({
        id: String(s.id || `step-${s.index}`),
        title: s.summary || s.operation || s.tool || `Step #${s.index ?? ''}`,
        summary: s.summary,
        tool: s.tool,
        operation: s.operation,
        status: (s.status || 'pending').toLowerCase() as any,
        startedAt: s.createdAt,
        safeSummary: s.summary,
      }))
    : [];

  const terminalLogs: AgentTerminalEvent[] = [];
  if (Array.isArray(raw.executions)) {
    raw.executions.forEach((ex: any) => {
      if (ex.stdout) {
        terminalLogs.push({
          id: `${ex.id}-stdout`,
          timestamp: ex.createdAt || '',
          stream: 'stdout',
          text: ex.stdout,
        });
      }
      if (ex.stderr) {
        terminalLogs.push({
          id: `${ex.id}-stderr`,
          timestamp: ex.createdAt || '',
          stream: 'stderr',
          text: ex.stderr,
        });
      }
    });
  }

  const filesChanged: AgentFileChange[] = Array.isArray(raw.fileChanges)
    ? raw.fileChanges.map((f: any) => ({
        path: f.path,
        changeType: (f.changeType || 'modified').toLowerCase() as any,
        sha256: f.sha256,
        sizeBytes: f.sizeBytes,
      }))
    : [];

  const approvals: AgentApproval[] = Array.isArray(raw.approvals)
    ? raw.approvals.map((a: any) => ({
        id: String(a.id),
        taskId: a.taskId ? String(a.taskId) : undefined,
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
        status: (a.status || 'PENDING').toUpperCase() as any,
        requestedAt: a.createdAt,
        decidedAt: a.decidedAt,
        expiresAt: a.expiresAt,
      }))
    : [];

  const goalText = raw.goal || raw.prompt || raw.title || '';
  const workspaceText = raw.workspace || raw.workspacePath || '';

  return {
    id: String(raw.id),
    deviceId: raw.deviceId,
    goal: goalText,
    workspace: workspaceText,
    status: (raw.status || 'QUEUED') as AgentTaskStatus,
    controlMode: (raw.controlMode || 'AGENT') as AgentControlMode,
    summary: raw.summary,
    deviceName: raw.deviceName,
    currentStep: steps.find((s) => s.status === 'running')?.title || raw.currentStep,
    steps,
    terminalLogs,
    filesChanged,
    approvals,
    browser: raw.browser,
    startedAt: raw.startedAt || raw.createdAt,
    finishedAt: raw.finishedAt,
    createdAt: raw.createdAt,
    actionCount: raw.actionCount,
    // Backward-compatibility accessors
    title: goalText,
    prompt: goalText,
    workspacePath: workspaceText,
    aiProfile: raw.aiProfile,
  };
}

export const desktopAgentClient = {
  // ================= 1. DEVICES =================
  async getDevices(): Promise<DesktopAgentDevice[]> {
    try {
      const res = await apiFetch(`${BASE_PREFIX}/desktop-agents/devices`);
      if (!res.ok) {
        if (res.status === 404) return [];
        const detail = await parseErrorDetail(res);
        throw new Error(detail);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('[DesktopAgentClient] getDevices backend not reachable or returned error:', err.message);
      return [];
    }
  },

  async pairDevice(
    code: string,
    allowedWorkspace: string,
    displayName?: string
  ): Promise<DesktopAgentDevice> {
    const payload: { code: string; allowedWorkspace: string; displayName?: string } = {
      code: code.trim(),
      allowedWorkspace: allowedWorkspace.trim(),
    };
    if (displayName && displayName.trim()) {
      payload.displayName = displayName.trim();
    }

    const res = await apiFetch(`${BASE_PREFIX}/desktop-agents/pair`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
    return await res.json();
  },

  async disconnectDevice(deviceId: string | number): Promise<void> {
    const res = await apiFetch(`${BASE_PREFIX}/desktop-agents/devices/${deviceId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  // ================= 2. TASK MANAGEMENT =================
  async getTasks(statusFilter?: string): Promise<AgentTask[]> {
    try {
      const url = statusFilter
        ? `${BASE_PREFIX}/agent-tasks?status=${encodeURIComponent(statusFilter)}`
        : `${BASE_PREFIX}/agent-tasks`;
      const res = await apiFetch(url);
      if (!res.ok) {
        if (res.status === 404) return [];
        const detail = await parseErrorDetail(res);
        throw new Error(detail);
      }
      const data = await res.json();
      return Array.isArray(data) ? data.map(normalizeTask) : [];
    } catch (err: any) {
      console.warn('[DesktopAgentClient] getTasks backend error:', err.message);
      return [];
    }
  },

  async getTask(id: string): Promise<AgentTask | null> {
    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks/${id}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
    const data = await res.json();
    return normalizeTask(data);
  },

  async createTask(payload: CreateTaskPayload): Promise<AgentTask> {
    const rawDeviceId =
      typeof payload.deviceId === 'string'
        ? parseInt(payload.deviceId, 10)
        : payload.deviceId;

    const requestBody: { deviceId: number; goal: string; workspace?: string; aiProfile?: string } = {
      deviceId: rawDeviceId,
      goal: payload.goal.trim(),
    };
    if (payload.workspace && payload.workspace.trim()) {
      requestBody.workspace = payload.workspace.trim();
    }
    if (payload.aiProfile && payload.aiProfile.trim()) {
      requestBody.aiProfile = payload.aiProfile.trim();
    }

    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
    const data = await res.json();
    return normalizeTask(data);
  },

  async pauseTask(id: string): Promise<void> {
    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks/${id}/pause`, {
      method: 'POST',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  async resumeTask(id: string): Promise<void> {
    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks/${id}/resume`, {
      method: 'POST',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  async stopTask(id: string): Promise<void> {
    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks/${id}/stop`, {
      method: 'POST',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  async takeControl(id: string): Promise<void> {
    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks/${id}/take-control`, {
      method: 'POST',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  async approveAction(taskId: string, approvalId: string): Promise<void> {
    const res = await apiFetch(
      `${BASE_PREFIX}/agent-tasks/${taskId}/approvals/${approvalId}/approve`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  async denyAction(taskId: string, approvalId: string): Promise<void> {
    const res = await apiFetch(
      `${BASE_PREFIX}/agent-tasks/${taskId}/approvals/${approvalId}/deny`,
      { method: 'POST' }
    );
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
  },

  // ================= 3. CONVERSATIONAL CONTINUATION =================
  async sendTaskMessage(taskId: string, message: string): Promise<any> {
    const res = await apiFetch(`${BASE_PREFIX}/agent-tasks/${taskId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: message.trim() }),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
    return await res.json();
  },

  // ================= 4. BROWSER DEVICE LINKING & DOWNLOADS =================
  async getLinkRequest(requestId: string): Promise<{
    linkRequestId: string;
    deviceUuid: string;
    hostname: string;
    displayName: string;
    os: string;
    agentVersion: string;
    requestedWorkspace: string;
    status: string;
    expiresInSeconds: number;
    expired: boolean;
  }> {
    const res = await apiFetch(`${BASE_PREFIX}/desktop-agents/link-requests/${encodeURIComponent(requestId)}`);
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
    return await res.json();
  },

  async authorizeLinkRequest(
    requestId: string,
    allowedWorkspace?: string,
    displayName?: string
  ): Promise<any> {
    const res = await apiFetch(`${BASE_PREFIX}/desktop-agents/link-requests/${encodeURIComponent(requestId)}/authorize`, {
      method: 'POST',
      body: JSON.stringify({ allowedWorkspace, displayName }),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail);
    }
    return await res.json();
  },

  async getDownloadInfo(): Promise<{
    downloadAvailable: boolean;
    downloadUrl: string | null;
    platform: string;
    agentVersion: string;
    instructions: string;
  }> {
    try {
      const res = await apiFetch(`${BASE_PREFIX}/desktop-agents/download-info`);
      if (!res.ok) {
        return {
          downloadAvailable: false,
          downloadUrl: null,
          platform: 'windows',
          agentVersion: '0.1.0',
          instructions: 'Desktop Agent download is not available in this environment. Use local setup scripts.',
        };
      }
      return await res.json();
    } catch {
      return {
        downloadAvailable: false,
        downloadUrl: null,
        platform: 'windows',
        agentVersion: '0.1.0',
        instructions: 'Desktop Agent download is not available in this environment. Use local setup scripts.',
      };
    }
  },
};


