import React from 'react';
import { AlertCircle, RefreshCw, Save, X } from 'lucide-react';
import { NeonButton } from '../common/NeonButton';

interface CvConflictModalProps {
  isOpen: boolean;
  isBusy: boolean;
  onClose: () => void;
  onReloadLatest: () => void;
  onForceOverwrite: () => void;
  ja: boolean;
}

export const CvConflictModal: React.FC<CvConflictModalProps> = ({
  isOpen,
  isBusy,
  onClose,
  onReloadLatest,
  onForceOverwrite,
  ja,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-red-200 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
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
            {ja ? '同時編集の競合を検出しました (HTTP 409)' : 'Concurrent Edit Conflict Detected (HTTP 409)'}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {ja
              ? 'この履歴書下書きは別のウィンドウまたはセッションで変更されています。意図しない上書きによるデータ消失を防ぐため、保存が一時中断されました。'
              : 'This draft was updated from another window or session while you were editing. To prevent accidental data loss, your save was safely held.'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-xs text-slate-700">
          <div className="font-semibold text-slate-900">
            {ja ? '次のいずれかを選択してください:' : 'Choose how you would like to proceed:'}
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="font-bold text-blue-700">{ja ? '最新版を読み込む（推奨）' : 'Reload Latest (Recommended)'}</span>:
              <p className="text-slate-500 mt-0.5">
                {ja
                  ? 'サーバー上の最新状態を読み込みます。編集中の内容を別の場所に一時メモしてから実行することをお勧めします。'
                  : 'Discard current local edits and load the newest version from the server.'}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="font-bold text-amber-700">{ja ? '現在の内容で強制上書き' : 'Force Overwrite'}</span>:
              <p className="text-slate-500 mt-0.5">
                {ja
                  ? '現在画面に表示されている内容でサーバー上のデータを強制的に上書き保存します。'
                  : 'Overwrite the server draft with your current screen state.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            {ja ? '閉じて編集を続ける' : 'Keep Editing Locally'}
          </button>
          <NeonButton
            variant="secondary"
            isLoading={isBusy}
            onClick={onReloadLatest}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {ja ? 'サーバーから再読み込み' : 'Reload from Server'}
          </NeonButton>
          <NeonButton
            variant="danger"
            isLoading={isBusy}
            onClick={onForceOverwrite}
            icon={<Save className="w-4 h-4" />}
          >
            {ja ? '強制上書き保存' : 'Force Overwrite'}
          </NeonButton>
        </div>
      </div>
    </div>
  );
};

