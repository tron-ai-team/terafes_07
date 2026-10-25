import { AgentRealtimeEvent, RealtimeEventType } from '../types/desktopAgent';
import { CORE_API_URL } from '../config/api';
import { getAccessToken } from './httpClient';

type EventCallback = (event: AgentRealtimeEvent) => void;

interface ActiveStream {
  url: string;
  abortController: AbortController;
  retryCount: number;
  reconnectTimer: any;
  isStreaming: boolean;
}

/**
 * TRON AI — Centralized Desktop Agent Authenticated Real-time SSE Client
 *
 * Implements authenticated fetch streaming + SSE parsing:
 * - GET /api/v1/agent-tasks/{id}/events
 * - GET /api/v1/desktop-agents/events
 * Both endpoints require:
 *   Authorization: Bearer <JWT>
 *   Accept: text/event-stream
 */
class AgentRealtimeClient {
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private activeStreams: Map<string, ActiveStream> = new Map();

  /**
   * Subscribe to events for a specific task
   */
  subscribeTask(taskId: string, callback: EventCallback): () => void {
    const key = `task:${taskId}`;
    const unsubscribe = this.addSubscriber(key, callback);
    this.ensureTaskStream(taskId);

    return () => {
      unsubscribe();
      // If no more subscribers for this task, shut down the stream
      const subs = this.subscribers.get(key);
      if (!subs || subs.size === 0) {
        this.stopStream(`task:${taskId}`);
      }
    };
  }

  /**
   * Subscribe to global device status changes
   */
  subscribeDevices(callback: EventCallback): () => void {
    const key = 'devices';
    const unsubscribe = this.addSubscriber(key, callback);
    this.ensureUserStream();

    return () => {
      unsubscribe();
      const subs = this.subscribers.get(key);
      if (!subs || subs.size === 0) {
        this.checkStopUserStream();
      }
    };
  }

  /**
   * Subscribe to all events of a specific type
   */
  subscribeEventType(type: RealtimeEventType, callback: EventCallback): () => void {
    const key = `type:${type}`;
    const unsubscribe = this.addSubscriber(key, callback);
    this.ensureUserStream();

    return () => {
      unsubscribe();
      const subs = this.subscribers.get(key);
      if (!subs || subs.size === 0) {
        this.checkStopUserStream();
      }
    };
  }

  private addSubscriber(key: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  private ensureTaskStream(taskId: string): void {
    const streamKey = `task:${taskId}`;
    if (this.activeStreams.has(streamKey)) return;

    const url = `${CORE_API_URL}/api/v1/agent-tasks/${encodeURIComponent(taskId)}/events`;
    this.startSseStream(streamKey, url, taskId);
  }

  private ensureUserStream(): void {
    const streamKey = 'user:events';
    if (this.activeStreams.has(streamKey)) return;

    const url = `${CORE_API_URL}/api/v1/desktop-agents/events`;
    this.startSseStream(streamKey, url);
  }

  private checkStopUserStream(): void {
    const hasDeviceSubs = (this.subscribers.get('devices')?.size || 0) > 0;
    const hasTypeSubs = Array.from(this.subscribers.keys()).some(
      (k) => k.startsWith('type:') && (this.subscribers.get(k)?.size || 0) > 0
    );

    if (!hasDeviceSubs && !hasTypeSubs) {
      this.stopStream('user:events');
    }
  }

  private startSseStream(streamKey: string, url: string, defaultTaskId?: string): void {
    if (this.activeStreams.has(streamKey)) return;

    const abortController = new AbortController();
    const streamObj: ActiveStream = {
      url,
      abortController,
      retryCount: 0,
      reconnectTimer: null,
      isStreaming: true,
    };
    this.activeStreams.set(streamKey, streamObj);

    this.runFetchSseLoop(streamKey, streamObj, defaultTaskId);
  }

  private async runFetchSseLoop(
    streamKey: string,
    streamObj: ActiveStream,
    defaultTaskId?: string
  ): Promise<void> {
    while (streamObj.isStreaming && !streamObj.abortController.signal.aborted) {
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(streamObj.url, {
          method: 'GET',
          headers,
          credentials: 'include',
          signal: streamObj.abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE stream HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('SSE stream response has no readable body');
        }

        // Reset retry count on successful open
        streamObj.retryCount = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (streamObj.isStreaming && !streamObj.abortController.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, '\n');

          let boundaryIndex: number;
          while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawBlock = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);
            this.parseAndDispatchSseBlock(rawBlock, defaultTaskId);
          }
        }
      } catch (err: any) {
        if (streamObj.abortController.signal.aborted) {
          return;
        }
        console.warn(`[AgentRealtimeClient] Stream [${streamKey}] connection dropped:`, err.message);
      }

      // Check if we should reconnect
      if (!streamObj.isStreaming || streamObj.abortController.signal.aborted) {
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, streamObj.retryCount), 15000);
      streamObj.retryCount++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  private parseAndDispatchSseBlock(rawBlock: string, defaultTaskId?: string): void {
    if (!rawBlock.trim()) return;

    const lines = rawBlock.split('\n');
    let eventName: string = 'message';
    const dataParts: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':')) {
        // SSE comment (e.g. ":connected" ping), ignore
        continue;
      }
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataParts.push(line.slice(5).trimStart());
      }
    }

    if (dataParts.length === 0) return;

    const rawData = dataParts.join('\n');
    let payload: any;
    try {
      payload = JSON.parse(rawData);
    } catch {
      payload = rawData;
    }

    const event: AgentRealtimeEvent = {
      type: eventName as RealtimeEventType,
      taskId: payload?.taskId || defaultTaskId,
      deviceId: payload?.deviceId ? String(payload.deviceId) : undefined,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.dispatch(event);
  }

  private stopStream(streamKey: string): void {
    const stream = this.activeStreams.get(streamKey);
    if (!stream) return;

    stream.isStreaming = false;
    if (stream.reconnectTimer) {
      clearTimeout(stream.reconnectTimer);
    }
    stream.abortController.abort();
    this.activeStreams.delete(streamKey);
  }

  /**
   * Dispatch event to relevant subscribers
   */
  dispatch(event: AgentRealtimeEvent): void {
    // 1. Task-specific subscribers
    if (event.taskId) {
      const taskSubs = this.subscribers.get(`task:${event.taskId}`);
      if (taskSubs) {
        taskSubs.forEach((cb) => {
          try {
            cb(event);
          } catch (e) {
            console.error('[AgentRealtimeClient] Task subscriber error:', e);
          }
        });
      }
    }

    // 2. Type-specific subscribers
    const typeSubs = this.subscribers.get(`type:${event.type}`);
    if (typeSubs) {
      typeSubs.forEach((cb) => {
        try {
          cb(event);
        } catch (e) {
          console.error('[AgentRealtimeClient] Type subscriber error:', e);
        }
      });
    }

    // 3. Global Device subscribers
    if (event.type === 'DEVICE_STATUS') {
      const devSubs = this.subscribers.get('devices');
      if (devSubs) {
        devSubs.forEach((cb) => {
          try {
            cb(event);
          } catch (e) {
            console.error('[AgentRealtimeClient] Device subscriber error:', e);
          }
        });
      }
    }
  }

  disconnect(): void {
    this.activeStreams.forEach((stream) => {
      stream.isStreaming = false;
      if (stream.reconnectTimer) clearTimeout(stream.reconnectTimer);
      stream.abortController.abort();
    });
    this.activeStreams.clear();
    this.subscribers.clear();
  }
}

export const agentRealtimeClient = new AgentRealtimeClient();

