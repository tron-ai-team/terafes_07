import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Sparkles,
  Download,
  Eye,
  Edit3,
  Columns,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { NeonButton } from '../common/NeonButton';
import type { CvBuilderTab } from './types';

interface CvBuilderHeaderProps {
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'conflict' | 'error';
  lastSavedAt: Date | null;
  activeTab: CvBuilderTab;
  onTabChange: (tab: CvBuilderTab) => void;
  isBusy: boolean;
  isExporting: boolean;
  hasErrors: boolean;
  onSave: () => void;
  onOpenMagicFill: () => void;
  onOpenProfileSync: () => void;
  onExportPdf: () => void;
  ja: boolean;
}

export const CvBuilderHeader: React.FC<CvBuilderHeaderProps> = ({
  hasUnsavedChanges,
  saveStatus,
  lastSavedAt,
  activeTab,
  onTabChange,
  isBusy,
  isExporting,
  hasErrors,
  onSave,
  onOpenMagicFill,
  onOpenProfileSync,
  onExportPdf,
  ja,
}) => {
  return (
    <div className="flex flex-col gap-4 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Title & Status */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/career"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Career Center</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">CV Builder V3</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              {ja ? 'TRON AI 履歴書ビルダー' : 'TRON AI Japanese CV Builder'}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              JIS規格・A4 2枚組
            </span>

            {/* Save Status Badge */}
            {saveStatus === 'saving' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {ja ? '保存中…' : 'Saving…'}
              </span>
            ) : hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {ja ? '未保存の変更あり' : 'Unsaved changes'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {ja ? '保存済み' : 'Saved'}
                {lastSavedAt && (
                  <span className="text-[10px] text-emerald-600 font-normal">
                    ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
            )}

            {saveStatus === 'conflict' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                {ja ? '競合あり (409)' : 'Conflict (409)'}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {ja
              ? '日本標準の履歴書作成 → プロフィール同期 → AI Magic Fill → リアルタイムA4プレビュー → PDF出力'
              : 'Official JIS RIREKISHO_JA — Candidate Sync, Cloud AI Magic Fill, Real-time A4 Preview, Chromium PDF'}
          </p>
        </div>

        {/* Right Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Profile Sync Button */}
          <button
            type="button"
            onClick={onOpenProfileSync}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>{ja ? 'プロフィール同期' : 'Profile Sync'}</span>
          </button>

          {/* AI Magic Fill Button */}
          <button
            type="button"
            onClick={onOpenMagicFill}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-blue-500/20 hover:brightness-105 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>✨ Magic Fill</span>
          </button>

          {/* Save Button */}
          <NeonButton
            onClick={onSave}
            isLoading={saveStatus === 'saving'}
            disabled={isBusy || !hasUnsavedChanges}
            icon={<Save className="w-4 h-4" />}
            size="md"
          >
            {ja ? '保存' : 'Save'}
          </NeonButton>

          {/* PDF Download Button */}
          <NeonButton
            onClick={onExportPdf}
            isLoading={isExporting}
            disabled={isBusy || hasErrors}
            icon={<Download className="w-4 h-4" />}
            size="md"
          >
            {ja ? 'PDF 出力' : 'Export PDF'}
          </NeonButton>
        </div>
      </div>

      {/* View Switcher Tabs (Desktop & Mobile) */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => onTabChange('editor')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'editor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{ja ? '編集フォーム' : 'Editor Form'}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('preview')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{ja ? 'A4 プレビュー' : 'A4 Preview'}</span>
          </button>

          {/* Split view visible on desktop screens (>= 1280px) */}
          <button
            type="button"
            onClick={() => onTabChange('split')}
            className={`hidden xl:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'split'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{ja ? '並列表示 (Split)' : 'Side-by-Side'}</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 hidden md:block">
          {ja ? 'ショートカット: Ctrl + S で保存' : 'Shortcut: Ctrl + S to Save'}
        </div>
      </div>
    </div>
  );
};

