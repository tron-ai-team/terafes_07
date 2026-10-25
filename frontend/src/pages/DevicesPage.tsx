import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { desktopAgentClient } from '../services/desktopAgentClient';
import { DesktopAgentDevice, DesktopAgentStatus } from '../types/desktopAgent';
import { PairDeviceModal } from '../components/agent/PairDeviceModal';
import { LocalSetupHelpModal } from '../components/agent/LocalSetupHelpModal';
import {
  Laptop,
  Plus,
  RefreshCw,
  HelpCircle,
  ShieldOff,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  StatusBadge,
  SectionHeader,
  EmptyState,
} from '../components/common/StatusDesignSystem';

export const DevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DesktopAgentDevice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPairModalOpen, setIsPairModalOpen] = useState<boolean>(false);
  const [isSetupHelpOpen, setIsSetupHelpOpen] = useState<boolean>(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [selectedDetailsDevice, setSelectedDetailsDevice] = useState<DesktopAgentDevice | null>(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const data = await desktopAgentClient.getDevices();
      setDevices(data);
    } catch (err: any) {
      console.warn('Devices fetch error:', err);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (deviceId: string | number, displayName: string) => {
    const confirmed = window.confirm(
      `Revoke authorization for "${displayName}"?\n\nThe agent will be disconnected from TRON Core and cannot run further actions until paired again.`
    );
    if (!confirmed) return;

    setRevokingId(String(deviceId));
    try {
      await desktopAgentClient.disconnectDevice(deviceId);
      setDevices((prev) =>
        prev.map((d) => (String(d.id) === String(deviceId) ? { ...d, status: 'REVOKED' } : d))
      );
      if (selectedDetailsDevice && String(selectedDetailsDevice.id) === String(deviceId)) {
        setSelectedDetailsDevice((prev) => prev ? { ...prev, status: 'REVOKED' } : null);
      }
    } catch (err: any) {
      alert(`Failed to revoke device: ${err.message}`);
    } finally {
      setRevokingId(null);
    }
  };

  const handleDevicePaired = (device: DesktopAgentDevice) => {
    setDevices((prev) => {
      const exists = prev.some((d) => d.id === device.id);
      if (exists) {
        return prev.map((d) => (d.id === device.id ? device : d));
      }
      return [...prev, device];
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
              Devices
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {devices.length} {devices.length === 1 ? 'computer' : 'computers'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Connected host machines authorized to execute TRON Coding Agent tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSetupHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            title="Local setup instructions"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Local Setup Help</span>
          </button>

          <button
            onClick={fetchDevices}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Refresh devices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsPairModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Computer</span>
          </button>
        </div>
      </div>

      {/* Devices View */}
      {devices.length === 0 ? (
        <EmptyState
          icon={<Laptop className="w-6 h-6" />}
          title="No computers connected"
          description="Connect TRON Desktop Agent to let TRON securely inspect repositories, execute terminal commands, edit local files, and run browser tasks."
          actionText="Connect Computer"
          onAction={() => setIsPairModalOpen(true)}
          secondaryActionText="Local Setup Help"
          onSecondaryAction={() => setIsSetupHelpOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const isOnline = device.status === 'ONLINE';
            const isRevoked = device.status === 'REVOKED';

            return (
              <div
                key={device.id}
                className="p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between gap-4"
              >
                {/* Header: Hostname & OS & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-mono">
                        {device.displayName || device.hostname || `Device #${device.id}`}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {device.os || 'Windows 11'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={device.status} size="sm" />
                </div>

                {/* Details snippet */}
                <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Workspace:</span>
                    <span className="font-mono text-slate-800 font-medium truncate max-w-[190px]">
                      {device.allowedWorkspace || 'C:\\Dev'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Last seen:</span>
                    <span className="text-slate-700">{device.lastSeen ? 'Recently' : 'Now'}</span>
                  </div>
                </div>

                {/* Action Buttons: [ Open ] [ Details ] */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate(`/workspace/agent?device=${device.id}`)}
                    disabled={isRevoked || !isOnline}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs text-center disabled:opacity-40 disabled:hover:brightness-100"
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailsDevice(device)}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Device Details Modal */}
      {selectedDetailsDevice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900 font-mono">
                  {selectedDetailsDevice.displayName || selectedDetailsDevice.hostname}
                </h3>
              </div>
              <StatusBadge status={selectedDetailsDevice.status} size="sm" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Operating System:</span>
                <span className="font-semibold text-slate-800">{selectedDetailsDevice.os || 'Windows 11'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Agent Version:</span>
                <span className="font-mono text-blue-600 font-semibold">{selectedDetailsDevice.agentVersion || '0.1.0'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Workspace Sandbox:</span>
                <span className="font-mono text-slate-800 font-bold">{selectedDetailsDevice.allowedWorkspace || 'C:\\Dev'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Device UUID:</span>
                <span className="font-mono text-[10px] text-slate-500 break-all max-w-[240px] text-right">
                  {selectedDetailsDevice.deviceUuid || 'N/A'}
                </span>
              </div>
              {selectedDetailsDevice.pairedAt && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Paired Date:</span>
                  <span className="text-slate-600">{selectedDetailsDevice.pairedAt}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  handleRevoke(selectedDetailsDevice.id, selectedDetailsDevice.displayName || 'Computer')
                }
                disabled={selectedDetailsDevice.status === 'REVOKED' || revokingId === String(selectedDetailsDevice.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                <span>{selectedDetailsDevice.status === 'REVOKED' ? 'Revoked' : 'Revoke'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailsDevice(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PairDeviceModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onDevicePaired={handleDevicePaired}
        onOpenSetupHelp={() => setIsSetupHelpOpen(true)}
      />

      <LocalSetupHelpModal
        isOpen={isSetupHelpOpen}
        onClose={() => setIsSetupHelpOpen(false)}
        onOpenPairModal={() => setIsPairModalOpen(true)}
      />
    </div>
  );
};
