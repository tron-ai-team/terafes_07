import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { AgentTask } from '../types/desktopAgent';
import { AgentStatusBadge } from '../components/agent/AgentStatusBadge';
import {
  Archive,
  RefreshCw,
  Clock,
  Laptop,
  FileCode,
  ArrowRight,
  Inbox,
} from 'lucide-react';

export const AgentHistoryPage: React.FC = () => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const allTasks = await desktopAgentClient.getTasks();
      // Filter for finished statuses: COMPLETED, FAILED, STOPPED
      const history = allTasks.filter((t) =>
        ['COMPLETED', 'FAILED', 'STOPPED'].includes(t.status)
      );
      setTasks(history);
    } catch (err) {
      console.warn('Failed to load history tasks:', err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Archive className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-display">
              Execution History
            </h1>
            <p className="text-xs text-slate-500">
              Review completed coding tasks, execution summaries, and touched files
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors self-start sm:self-auto"
          title="Refresh history"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* History List or Empty State */}
      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center shadow-inner">
            <Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-extrabold text-base text-slate-900">
              No completed tasks yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When tasks finish running on your connected TRON Desktop Agents, full execution records, file diffs, and verification logs will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Task</th>
                  <th className="p-4 font-bold">Device</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Duration</th>
                  <th className="p-4 font-bold">Files Changed</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {task.goal || task.title || task.prompt}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Started: {task.startedAt || 'Recent'}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-blue-500" />
                        <span>{task.deviceName || task.deviceId}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <AgentStatusBadge status={task.status} controlMode={task.controlMode} size="sm" />
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{task.duration || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{task.filesChanged?.length || 0} files</span>
                      </div>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <Link
                        to={`/workspace/agent/tasks/${task.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold text-xs transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
