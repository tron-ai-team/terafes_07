import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requiresTypeEmail?: string; // If provided, user must type this email to confirm
  requiresReason?: boolean;
  reasonLabel?: string;
  onReasonChange?: (reason: string) => void;
  isLoading?: boolean;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  requiresTypeEmail,
  requiresReason = false,
  reasonLabel = 'Reason for this administrative action',
  onReasonChange,
  isLoading = false,
}) => {
  const [typedEmail, setTypedEmail] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const canConfirm = (!requiresTypeEmail || typedEmail === requiresTypeEmail) && (!requiresReason || reason.trim().length > 0);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    if (onReasonChange) onReasonChange(reason);
    await onConfirm();
    setTypedEmail('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {isDestructive ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Administrative Authorization Safeguard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

          {requiresReason && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{reasonLabel}</label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (onReasonChange) onReasonChange(e.target.value);
                }}
                placeholder="Enter justification for audit log..."
                rows={2}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {requiresTypeEmail && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Type <span className="font-mono text-rose-600 font-bold">{requiresTypeEmail}</span> to confirm:
              </label>
              <input
                type="text"
                value={typedEmail}
                onChange={(e) => setTypedEmail(e.target.value)}
                placeholder={requiresTypeEmail}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20'
                : 'bg-slate-900 hover:bg-slate-800 shadow-sm'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
