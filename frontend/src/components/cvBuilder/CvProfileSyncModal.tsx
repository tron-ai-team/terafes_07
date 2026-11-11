import React, { useState } from 'react';
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { NeonButton } from '../common/NeonButton';
import type { ProfileSyncMode } from './types';
import type { CvSyncReport } from '../../types/careerCenter';

interface CvProfileSyncModalProps {
  isOpen: boolean;
  isBusy: boolean;
  onClose: () => void;
  onConfirmSync: (mode: ProfileSyncMode) => Promise<CvSyncReport | undefined>;
  ja: boolean;
}

export const CvProfileSyncModal: React.FC<CvProfileSyncModalProps> = ({
  isOpen,
  isBusy,
  onClose,
  onConfirmSync,
  ja,
}) => {
  const [selectedMode, setSelectedMode] = useState<ProfileSyncMode>('FILL_BLANK');
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [syncReport, setSyncReport] = useState<CvSyncReport | null>(null);

  if (!isOpen) return null;

  const requiresExplicitConfirm =
    selectedMode === 'REPLACE_ALL' || selectedMode === 'OVERWRITE_SCALARS';

  const handleExecute = async () => {
    if (requiresExplicitConfirm && !confirmDestructive) {
      return;
    }
    const report = await onConfirmSync(selectedMode);
    if (report) {
      setSyncReport(report);
    }
  };

  const handleClose = () => {
    setSyncReport(null);
    setConfirmDestructive(false);
    setSelectedMode('FILL_BLANK');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {ja ? '候補者プロフィールの同期' : 'Candidate Profile Sync'}
              </h3>
              <p className="text-xs text-slate-500">
                {ja
                  ? '登録された最新プロフィール情報をこの履歴書に安全に取り込みます'
                  : 'Import verified profile details into this Japanese CV draft'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {syncReport ? (
          /* Post-sync Report Screen */
          <div className="space-y-4 animate-in fade-in">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">
                  {ja ? 'プロフィールの同期が完了しました' : 'Profile Synchronized Successfully'}
                </div>
                <div className="text-xs text-emerald-700">
                  {ja
                    ? `モード: ${syncReport.mode} で適用されました`
                    : `Applied with mode: ${syncReport.mode}`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-2xl font-black text-blue-600">{syncReport.filled?.length || 0}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1">{ja ? '新規入力' : 'Fields Filled'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-2xl font-black text-emerald-600">{syncReport.preserved?.length || 0}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1">{ja ? '手動編集を維持' : 'Preserved'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 col-span-2 sm:col-span-1">
                <div className="text-2xl font-black text-purple-600">{syncReport.draftOnlyPreserved?.length || 0}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1">{ja ? '独自項目保持' : 'Draft-only Kept'}</div>
              </div>
            </div>

            {syncReport.filled && syncReport.filled.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <span className="font-bold text-slate-700">{ja ? '反映された項目: ' : 'Filled fields: '}</span>
                <span className="text-slate-600 font-mono">{syncReport.filled.join(', ')}</span>
              </div>
            )}

            {syncReport.preserved && syncReport.preserved.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <span className="font-bold text-slate-700">{ja ? '保持された既存入力: ' : 'Preserved edits: '}</span>
                <span className="text-slate-600 font-mono">{syncReport.preserved.join(', ')}</span>
              </div>
            )}

            {syncReport.conflicts && syncReport.conflicts.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1">
                <span className="font-bold text-amber-900">{ja ? '競合（手動値を優先）: ' : 'Conflicts (manual kept): '}</span>
                <span className="text-amber-800 font-mono">{syncReport.conflicts.join(', ')}</span>
              </div>
            )}

            {syncReport.missingInProfile && syncReport.missingInProfile.length > 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <span className="font-bold text-slate-700">{ja ? 'プロフィール未設定: ' : 'Missing in profile: '}</span>
                <span className="text-slate-600 font-mono">{syncReport.missingInProfile.join(', ')}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <NeonButton onClick={handleClose}>
                {ja ? 'エディタに戻る' : 'Return to Editor'}
              </NeonButton>
            </div>
          </div>
        ) : (
          /* Mode Selection Screen */
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {ja ? '同期モードを選択（デフォルト: 空白項目のみ）' : 'Select Synchronization Mode'}
            </div>

            <div className="space-y-3">
              {/* Option 1: FILL_BLANK (Default) */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedMode === 'FILL_BLANK'
                    ? 'border-blue-500 bg-blue-50/70 shadow-sm shadow-blue-500/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="FILL_BLANK"
                  checked={selectedMode === 'FILL_BLANK'}
                  onChange={() => {
                    setSelectedMode('FILL_BLANK');
                    setConfirmDestructive(false);
                  }}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {ja ? '空白項目のみ補完（推奨・安全）' : 'Fill Blank Fields Only (Recommended)'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Default
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ja
                      ? '履歴書内の空欄のみをプロフィール情報で埋めます。あなたが手入力した内容や学歴・職歴リストは一切上書きされません。'
                      : 'Fills only empty inputs. Any manual changes, text revisions, and existing education/career entries remain untouched.'}
                  </p>
                </div>
              </label>

              {/* Option 2: OVERWRITE_SCALARS */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedMode === 'OVERWRITE_SCALARS'
                    ? 'border-blue-500 bg-blue-50/70 shadow-sm shadow-blue-500/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="OVERWRITE_SCALARS"
                  checked={selectedMode === 'OVERWRITE_SCALARS'}
                  onChange={() => {
                    setSelectedMode('OVERWRITE_SCALARS');
                    setConfirmDestructive(false);
                  }}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-1 flex-1">
                  <span className="text-sm font-bold text-slate-900">
                    {ja ? '基本情報のみ更新（氏名・住所・連絡先）' : 'Overwrite Scalar Fields (Name & Contact)'}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ja
                      ? '氏名、ふりがな、生年月日、住所、電話、メールなどの基本情報を最新プロフィールで上書きします。学歴・職歴リストは保護されます。'
                      : 'Updates personal details and contact info with the latest master profile. Education and experience lists are preserved.'}
                  </p>
                </div>
              </label>

              {/* Option 3: REPLACE_ALL */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedMode === 'REPLACE_ALL'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm shadow-amber-500/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  value="REPLACE_ALL"
                  checked={selectedMode === 'REPLACE_ALL'}
                  onChange={() => {
                    setSelectedMode('REPLACE_ALL');
                    setConfirmDestructive(false);
                  }}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {ja ? '全項目を完全再同期（置き換え）' : 'Replace All Profile Fields'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {ja ? '注意' : 'Caution'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ja
                      ? '学歴・職歴・資格を含め、候補者プロフィールと連動する全項目をマスターの内容で完全に置き換えます（下書き固有の趣味や志望企業メモは保持されます）。'
                      : 'Replaces all profile-mapped fields including education, work experience, and certifications. Draft-only fields like hobbies remain.'}
                  </p>
                </div>
              </label>
            </div>

            {requiresExplicitConfirm && (
              <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  {selectedMode === 'REPLACE_ALL'
                    ? ja
                      ? '破壊的な置き換えの確認'
                      : 'Confirm Complete Replacement'
                    : ja
                      ? '基本情報上書きの確認'
                      : 'Confirm Scalar Overwrite'}
                </div>
                <p className="text-xs text-amber-800">
                  {selectedMode === 'REPLACE_ALL'
                    ? ja
                      ? 'この操作を行うと、現在この履歴書に手動で入力された学歴・職歴・自己PRなどの変更がプロフィールの内容で上書きされます。'
                      : 'This action will overwrite any manual custom edits in this CV with data from your master profile.'
                    : ja
                      ? '氏名・連絡先などの基本情報は最新プロフィールで上書きされます。学歴・職歴リストは保護されます。'
                      : 'Personal/contact scalars will be overwritten from profile. Education and experience lists stay protected.'}
                </p>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={confirmDestructive}
                    onChange={(e) => setConfirmDestructive(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    {ja
                      ? '現在の入力内容が上書きされることを理解して実行します'
                      : 'I understand and confirm overwriting existing CV contents'}
                  </span>
                </label>
              </div>
            )}

            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isBusy}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                {ja ? 'キャンセル' : 'Cancel'}
              </button>
              <NeonButton
                isLoading={isBusy}
                disabled={requiresExplicitConfirm && !confirmDestructive}
                onClick={() => void handleExecute()}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                {ja ? 'プロフィールから反映' : 'Sync Profile'}
              </NeonButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

