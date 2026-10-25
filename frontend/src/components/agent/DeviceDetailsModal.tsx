import React, { useState } from 'react';
import { DesktopAgentDevice } from '../../types/desktopAgent';
import { X, Laptop, ShieldCheck, FolderCode, Trash2, Cpu, Key, Clock, CheckCircle2 } from 'lucide-react';
import { desktopAgentClient } from '../../services/desktopAgentClient';

interface DeviceDetailsModalProps {
  device: DesktopAgentDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onDeviceUpdated?: (device: DesktopAgentDevice) => void;
  onDeviceDisconnected: (deviceId: string) => void;
}

export const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({
  device,
  isOpen,
  onClose,
  onDeviceDisconnected,
}) => {
  if (!isOpen || !device) return null;

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!window.confirm(`Are you sure you want to disconnect ${device.displayName}?`)) return;
    setIsDisconnecting(true);
    try {
      await desktopAgentClient.disconnectDevice(device.id);
      onDeviceDisconnected(String(device.id));
      onClose();
    } catch (err: any) {
      alert(`Failed to disconnect: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isOnline = device.status === 'ONLINE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-blue-50/80 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">{device.displayName}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {device.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {device.os} • Agent v{device.agentVersion || '1.0.0'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl text-xs">
            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> Last Seen
              </span>
              <p className="font-semibold text-slate-800">{device.lastSeen || 'Recently'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Paired At
              </span>
              <p className="font-semibold text-slate-800">{device.pairedAt || 'Active Session'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Cpu className="w-3.5 h-3.5" /> Hostname
              </span>
              <p className="font-semibold text-slate-800 font-mono text-[11px]">
                {device.hostname || 'Localhost'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Key className="w-3.5 h-3.5" /> Fingerprint
              </span>
              <p className="font-semibold text-slate-800 font-mono text-[11px] truncate" title={device.fingerprint}>
                {device.fingerprint ? `${device.fingerprint.slice(0, 16)}...` : 'Verified Key'}
              </p>
            </div>
          </div>

          {/* Allowed Workspace Read-only */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1.5">
              <FolderCode className="w-4 h-4 text-blue-600" />
              <span>Allowed Workspace</span>
            </span>
            <p className="font-mono text-xs font-bold text-slate-800 break-all select-all">
              {device.allowedWorkspace || 'C:\\Dev'}
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Designated workspace directory set during pairing. The agent operates exclusively within this path.
            </p>
          </div>

          {/* Security & Sandbox Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800">Sandboxed Agent Isolation</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All filesystem modifications and terminal commands outside safe reads require interactive human approval from the Web Console before executing.
              </p>
            </div>
          </div>

          {/* Actions: Disconnect Device / Close */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect Device'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

