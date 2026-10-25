package com.tronai.desktop.process;

import com.tronai.desktop.terminal.OsProcessRunner;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks only processes this agent started. Arbitrary system processes are not killed.
 */
public final class ProcessRegistry {

    private final Map<Long, OwnedProcess> processes = new ConcurrentHashMap<>();

    public void track(OsProcessRunner.Owned owned) {
        processes.put(owned.process().pid(), new OwnedProcess(
                owned.process().pid(), owned.taskId(), owned.command(), owned.workingDirectory(), Instant.now(), owned.process()));
    }

    public boolean stop(long pid, String taskId) {
        OwnedProcess owned = processes.get(pid);
        if (owned == null) {
            return false;
        }
        if (taskId != null && owned.taskId != null && !taskId.equals(owned.taskId)) {
            return false;
        }
        OsProcessRunner.destroyTree(owned.process);
        processes.remove(pid);
        return true;
    }

    public int stopTask(String taskId) {
        int stopped = 0;
        for (OwnedProcess owned : List.copy(processes)) {
            if (taskId.equals(owned.taskId)) {
                if (stop(owned.pid, taskId)) {
                    stopped++;
                }
            }
        }
        return stopped;
    }

    public Map<Long, OwnedProcess> snapshot() {
        return Map.copyOf(processes);
    }

    public record OwnedProcess(long pid, String taskId, String command, String workingDirectory, Instant startedAt, Process process) {
    }

    private static final class List {
        private static java.util.List<OwnedProcess> copy(Map<Long, OwnedProcess> processes) {
            return java.util.List.copyOf(processes.values());
        }
    }
}
