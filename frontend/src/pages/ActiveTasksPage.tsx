import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { AgentTask } from '../types/desktopAgent';
import { AgentStatusBadge } from '../components/agent/AgentStatusBadge';
import {
  Activity,
  Laptop,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react';

export const ActiveTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchActiveTasks = async () => {
    setIsLoading(true);
    try {
      const allTasks = await desktopAgentClient.getTasks();
      // Filter for active statuses: QUEUED, PLANNING, RUNNING, WAITING_APPROVAL, PAUSED
      const active = allTasks.filter((t) =>
        ['QUEUED', 'PLANNING', 'RUNNING', 'WAITING_APPROVAL', 'PAUSED'].includes(
          t.status
        )
      );
      setTasks(active);
    } catch (err) {
      console.warn('Failed to load active tasks:', err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTasks();
    const interval = setInterval(fetchActiveTasks, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#008CFF] to-[#0066FF] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
              Active Agent Tasks
            </h1>
            <p className="text-xs text-slate-500">
              Live monitoring and control of currently running desktop execution tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchActiveTasks}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/workspace/agent"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>NEW TASK</span>
          </Link>
        </div>
      </div>

      {/* Task List or Empty State */}
      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
            <PlayCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-extrabold text-base text-slate-900">
              No tasks currently running
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              TRON Coding Agent is idle. Assign a software engineering task to any connected PC to begin autonomous execution.
            </p>
          </div>
          <Link
            to="/workspace/agent"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:brightness-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>START A TASK</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <AgentStatusBadge status={task.status} controlMode={task.controlMode} />
                  <span className="text-xs font-mono font-bold text-slate-800 truncate">
                    #{task.id}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Laptop className="w-3.5 h-3.5 text-blue-500" />
                    <span>{task.deviceName || task.deviceId}</span>
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-slate-900 truncate">
                  {task.goal || task.title || task.prompt || 'Agent Task'}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                    {task.workspace || task.workspacePath}
                  </span>
                  {task.currentStep && (
                    <span className="text-blue-600 font-medium truncate">
                      Current Step: {task.currentStep}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {task.duration || 'Active'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/workspace/agent/tasks/${task.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                >
                  <span>OPEN TASK</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
