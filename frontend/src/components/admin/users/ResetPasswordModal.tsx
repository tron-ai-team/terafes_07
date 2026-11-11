import React, { useState } from 'react';
import { X, KeyRound, Copy, Check, ShieldAlert } from 'lucide-react';
import { AdminUser } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface ResetPasswordModalProps {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: number, tempPass: string) => Promise<void>;
  lang: 'en' | 'ja';
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  isOpen,
  onClose,
  onSubmit,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const [tempPass, setTempPass] = useState(() => 'TronTemp_' + Math.random().toString(36).substring(2, 10) + '!');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPass);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(user.id, tempPass);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.users.modal.resetPasswordTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
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
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 leading-relaxed">
            A temporary password will be assigned. The user will be required to change their password upon their next sign-in. Existing sessions will be terminated.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Generated Temporary Password
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={tempPass}
                className="flex-1 font-mono text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Admins and system owners never have access to cleartext passwords. Only one-way password reset operations are permitted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            {isSubmitting ? 'Applying...' : 'Apply Password Reset'}
          </button>
        </div>
      </div>
    </div>
  );
};
