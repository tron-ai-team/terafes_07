import React from 'react';
import { DesktopAgentDevice, DesktopAgentStatus } from '../../types/desktopAgent';
import { Laptop, ChevronDown, Plus, AlertCircle, RefreshCw } from 'lucide-react';

interface DeviceSelectorProps {
  devices: DesktopAgentDevice[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onOpenPairModal: () => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onOpenPairModal,
  isLoading = false,
  onRefresh,
  className = '',
}) => {
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  const getStatusBadge = (status: DesktopAgentStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        );
      case 'BUSY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            BUSY
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            OFFLINE
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            REVOKED
          </span>
        );
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
          Target Device
        </label>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
            title="Refresh paired devices"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>No paired Desktop Agents found.</span>
          </div>
          <button
            type="button"
            onClick={onOpenPairModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pair Device</span>
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Laptop className="w-4 h-4 text-blue-600" />
            </div>

            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#D6E6F7] rounded-xl text-xs font-semibold text-slate-800 appearance-none shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="" disabled>
                Select a connected PC...
              </option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.displayName} ({device.os}) — {device.status} [Workspace: {device.allowedWorkspace}]
                </option>
              ))}
            </select>

            <div className="absolute right-3.5 text-slate-400 pointer-events-none">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {selectedDevice && (
            <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50/50 border border-blue-100 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedDevice.status)}
                <span className="font-medium text-slate-700">{selectedDevice.displayName}</span>
                <span className="text-slate-400">({selectedDevice.os})</span>
              </div>
              <span className="font-mono text-slate-500 truncate max-w-[200px]">
                {selectedDevice.allowedWorkspace}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
