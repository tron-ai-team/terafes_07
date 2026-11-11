import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { NeonButton } from '../common/NeonButton';

interface CvDeleteModalProps {
  isOpen: boolean;
  draftLabel: string;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ja: boolean;
}

export const CvDeleteModal: React.FC<CvDeleteModalProps> = ({
  isOpen,
  draftLabel,
  isBusy,
  onClose,
  onConfirm,
  ja,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            {ja ? '履歴書下書きを削除しますか？' : 'Delete CV Draft?'}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {ja ? (
              <>
                「<span className="font-semibold text-slate-900">{draftLabel}</span>」を削除します。
                マスターの候補者プロフィールや保存されたテンプレート設定は保持されます。
              </>
            ) : (
              <>
                Are you sure you want to delete &ldquo;
                <span className="font-semibold text-slate-900">{draftLabel}</span>
                &rdquo;? Your master candidate profile remains safe and unchanged.
              </>
            )}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            {ja
              ? '削除した下書きは復元できません。必要な場合は事前にバージョン保存を行ってください。'
              : 'Deleted drafts cannot be restored. Make sure you have exported your PDF or saved a snapshot if needed.'}
          </span>
        </div>

        <div className="flex justify-end items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            {ja ? 'キャンセル' : 'Cancel'}
          </button>
          <NeonButton
            variant="danger"
            isLoading={isBusy}
            onClick={onConfirm}
            icon={<Trash2 className="w-4 h-4" />}
          >
            {ja ? '完全に削除' : 'Delete Draft'}
          </NeonButton>
        </div>
      </div>
    </div>
  );
};

