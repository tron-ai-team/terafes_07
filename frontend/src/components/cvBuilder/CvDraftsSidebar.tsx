import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Bookmark,
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import type { CvDraft, CvVersionSummary } from '../../types/careerCenter';
import {
  RIREKISHO_CAPACITIES,
  type RirekishoValidationResult,
} from '../../templates/rirekishoCanonicalTemplate';

interface CvDraftsSidebarProps {
  drafts: CvDraft[];
  activeDraft: CvDraft | null;
  versions: CvVersionSummary[];
  validation: RirekishoValidationResult;
  isBusy: boolean;
  onSelectDraft: (id: string) => void;
  onCreateDraft: () => void;
  onDeleteDraftClick: (id: string, label: string) => void;
  onSaveSnapshot: () => void;
  onRestoreVersion: (versionId: string) => void;
  ja: boolean;
}

export const CvDraftsSidebar: React.FC<CvDraftsSidebarProps> = ({
  drafts,
  activeDraft,
  versions,
  validation,
  isBusy,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraftClick,
  onSaveSnapshot,
  onRestoreVersion,
  ja,
}) => {
  const [showVersions, setShowVersions] = useState(true);

  return (
    <div className="space-y-4">
      {/* 1. Document Specifications & Capacity Card */}
      <GlassCard className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            {ja ? 'ドキュメント仕様' : 'Document Specs'}
          </span>
          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
            JIS規格
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{ja ? '日本標準 履歴書' : 'Japanese 履歴書'}</span>
            <span className="text-[11px] text-slate-500 font-mono">RIREKISHO_JA</span>
          </div>
          <div className="text-slate-500 text-[11px] leading-relaxed">
            {ja ? 'A4判 縦 2枚組 (JIS規格・公式座標印刷仕様)' : 'A4 Portrait 2-Page Standard (JIS Grid Layout)'}
          </div>
        </div>

        {/* Live Capacities Monitor */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-700 uppercase flex items-center justify-between">
            <span>{ja ? '枠内行数・文字数容量' : 'Print Capacities'}</span>
            {validation.hasErrors ? (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {ja ? '溢れあり' : 'Overflow'}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {ja ? '適正' : 'OK'}
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {/* Education */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600">{ja ? '学歴（展開行数）' : 'Education Lines'}</span>
                <span
                  className={`font-mono font-bold ${
                    validation.capacities.educationLines > RIREKISHO_CAPACITIES.MAX_EDU_LINES
                      ? 'text-red-600'
                      : 'text-slate-700'
                  }`}
                >
                  {validation.capacities.educationLines} / {RIREKISHO_CAPACITIES.MAX_EDU_LINES}行
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    validation.capacities.educationLines > RIREKISHO_CAPACITIES.MAX_EDU_LINES
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (validation.capacities.educationLines / RIREKISHO_CAPACITIES.MAX_EDU_LINES) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Work History */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600">{ja ? '職歴' : 'Work Entries'}</span>
                <span
                  className={`font-mono font-bold ${
                    validation.capacities.workLines > RIREKISHO_CAPACITIES.MAX_WORK_LINES
                      ? 'text-red-600'
                      : 'text-slate-700'
                  }`}
                >
                  {validation.capacities.workLines} / {RIREKISHO_CAPACITIES.MAX_WORK_LINES}件
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    validation.capacities.workLines > RIREKISHO_CAPACITIES.MAX_WORK_LINES
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (validation.capacities.workLines / RIREKISHO_CAPACITIES.MAX_WORK_LINES) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Certifications */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600">{ja ? '免許・資格' : 'Certifications'}</span>
                <span
                  className={`font-mono font-bold ${
                    validation.capacities.certLines > RIREKISHO_CAPACITIES.MAX_CERT_LINES
                      ? 'text-red-600'
                      : 'text-slate-700'
                  }`}
                >
                  {validation.capacities.certLines} / {RIREKISHO_CAPACITIES.MAX_CERT_LINES}件
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    validation.capacities.certLines > RIREKISHO_CAPACITIES.MAX_CERT_LINES
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (validation.capacities.certLines / RIREKISHO_CAPACITIES.MAX_CERT_LINES) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Self PR */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-600">{ja ? '自己PR文字数' : 'Self PR Chars'}</span>
                <span
                  className={`font-mono font-bold ${
                    validation.capacities.selfPrChars > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS
                      ? 'text-amber-600'
                      : 'text-slate-700'
                  }`}
                >
                  {validation.capacities.selfPrChars} / 約{RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS}字
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    validation.capacities.selfPrChars > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (validation.capacities.selfPrChars / RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Link to Candidate Profile */}
        <div className="pt-2 border-t border-slate-100">
          <Link
            to="/career/profile"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-between group"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {ja ? 'マスタープロフィール編集' : 'Candidate Profile'}
            </span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </GlassCard>

      {/* 2. Drafts List Card */}
      <GlassCard className="p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              {ja ? '作成済み下書き' : 'Saved Drafts'}
            </span>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              {drafts.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onCreateDraft}
            disabled={isBusy}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            {ja ? '新規作成' : 'New'}
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {drafts.length === 0 ? (
            <div className="text-center py-5 text-xs text-slate-400">
              {ja ? '下書きはありません' : 'No drafts yet'}
            </div>
          ) : (
            drafts.map((d) => {
              const isActive = activeDraft?.id === d.id;
              const dateStr = d.updatedAt
                ? new Date(d.updatedAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              const label = d.versionLabel || `履歴書 ${d.id.slice(0, 6)}`;

              return (
                <div
                  key={d.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/80 shadow-sm'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDraft(d.id)}
                    disabled={isBusy}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-semibold text-slate-900 truncate">{label}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDraftClick(d.id, label)}
                    disabled={isBusy}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0"
                    title={ja ? '下書きを削除' : 'Delete Draft'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* 3. Version History Snapshots */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span>{ja ? 'バージョン履歴' : 'Version History'}</span>
              <span className="text-[10px] text-slate-400 font-mono">({versions.length})</span>
              {showVersions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={onSaveSnapshot}
              disabled={isBusy || !activeDraft}
              className="text-[11px] font-semibold text-purple-600 hover:underline"
            >
              {ja ? '+ スナップショット' : '+ Snapshot'}
            </button>
          </div>

          {showVersions && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <div className="text-center py-2 text-[11px] text-slate-400">
                  {ja ? '保存されたバージョンはありません' : 'No snapshots saved'}
                </div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.versionId}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                  >
                    <div className="truncate mr-2">
                      <span className="font-bold text-purple-700">v{v.versionNumber}</span>{' '}
                      <span className="text-slate-600">{v.versionLabel || 'Snapshot'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestoreVersion(v.versionId)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs"
                      title={ja ? 'このバージョンに復元' : 'Restore this version'}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      {ja ? '復元' : 'Restore'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

