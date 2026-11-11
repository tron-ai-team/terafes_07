import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import type {
  CvDraft,
  CvEducationPreview,
  CvSuggestion,
  CvSyncReport,
  CvVersionSummary,
} from '../types/careerCenter';
import { ApiError } from '../services/httpClient';
import {
  FileText,
  Sparkles,
  Download,
  Save,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Plus,
  Eye,
  Edit3,
  Columns,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  validateRirekishoPayload,
  type RirekishoValidationResult,
} from '../templates/rirekishoCanonicalTemplate';

// V3 Modular Components
import { CvBuilderHeader } from '../components/cvBuilder/CvBuilderHeader';
import { CvDraftsSidebar } from '../components/cvBuilder/CvDraftsSidebar';
import { CvEditor } from '../components/cvBuilder/CvEditor';
import { CvLivePreview } from '../components/cvBuilder/CvLivePreview';
import { CvMagicFillModal } from '../components/cvBuilder/CvMagicFillModal';
import { CvProfileSyncModal } from '../components/cvBuilder/CvProfileSyncModal';
import { CvConflictModal } from '../components/cvBuilder/CvConflictModal';
import { CvDeleteModal } from '../components/cvBuilder/CvDeleteModal';
import { CvSingleFieldAiModal } from '../components/cvBuilder/CvSingleFieldAiModal';
import type { CvBuilderTab, ProfileSyncMode } from '../components/cvBuilder/types';

export const CvBuilderPage: React.FC = () => {
  const { addToast, uiLanguage, checkBackendHealth } = useApp();
  const ja = uiLanguage === 'ja';

  // ── Core Draft State ────────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<CvDraft[]>([]);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'conflict' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // ── View & Layout State ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CvBuilderTab>('editor');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Versions & Photo ────────────────────────────────────────────────────────
  const [versions, setVersions] = useState<CvVersionSummary[]>([]);
  const [photoThumbUrl, setPhotoThumbUrl] = useState<string | null>(null);

  // ── Canonical Preview State ─────────────────────────────────────────────────
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewHtmlUrlRef = useRef<string | null>(null);

  // ── Magic Fill State ────────────────────────────────────────────────────────
  const [showMagicFillModal, setShowMagicFillModal] = useState(false);
  const [magicSuggestions, setMagicSuggestions] = useState<CvSuggestion[]>([]);
  const [magicWarnings, setMagicWarnings] = useState<string[]>([]);
  const [magicGenerating, setMagicGenerating] = useState(false);
  const [magicDeciding, setMagicDeciding] = useState(false);
  const [magicCompanyContext, setMagicCompanyContext] = useState('');

  // ── Modals State ────────────────────────────────────────────────────────────
  const [showProfileSyncModal, setShowProfileSyncModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    id: string;
    label: string;
  }>({
    isOpen: false,
    id: '',
    label: '',
  });
  const [singleAiState, setSingleAiState] = useState<{
    isOpen: boolean;
    fieldKey: string;
    fieldLabel: string;
    currentValue: string;
  }>({
    isOpen: false,
    fieldKey: '',
    fieldLabel: '',
    currentValue: '',
  });

  // ── Validation Calculation ──────────────────────────────────────────────────
  const validation: RirekishoValidationResult = useMemo(() => {
    return validateRirekishoPayload(payload);
  }, [payload]);

  // ── Photo Object URL Management ─────────────────────────────────────────────
  const clearPhotoThumb = useCallback(() => {
    if (photoThumbUrl) URL.revokeObjectURL(photoThumbUrl);
    setPhotoThumbUrl(null);
  }, [photoThumbUrl]);

  const refreshPhotoThumb = useCallback(async (currentDraft: CvDraft) => {
    clearPhotoThumb();
    if (!currentDraft.photo?.available) return;
    try {
      const url = await careerCenterClient.getDraftPhotoObjectUrl(currentDraft.id);
      if (url) setPhotoThumbUrl(url);
    } catch {
      // Photo unavailable
    }
  }, [clearPhotoThumb]);

  useEffect(() => {
    return () => {
      if (photoThumbUrl) URL.revokeObjectURL(photoThumbUrl);
    };
  }, [photoThumbUrl]);

  // ── Apply Draft to State ────────────────────────────────────────────────────
  const applyDraft = useCallback((full: CvDraft, resetUnsaved = true) => {
    setDraft(full);
    setPayload(full.payload || {});
    setExpectedUpdatedAt(full.updatedAt || null);
    if (resetUnsaved) {
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    }
    void refreshPhotoThumb(full);
  }, [refreshPhotoThumb]);

  const loadVersions = useCallback(async (draftId: string) => {
    try {
      const list = await careerCenterClient.listVersions(draftId);
      setVersions(list);
    } catch {
      setVersions([]);
    }
  }, []);

  // ── Unsaved Changes Guard ───────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Field Change Handler ────────────────────────────────────────────────────
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  }, []);

  // ── Live Preview Generator ──────────────────────────────────────────────────
  const triggerPreviewFetch = useCallback(
    async (draftId: string, currentPayload: Record<string, unknown>) => {
      setPreviewBusy(true);
      setPreviewError(null);
      try {
        const url = await careerCenterClient.previewHtml(draftId, currentPayload);
        if (previewHtmlUrlRef.current) URL.revokeObjectURL(previewHtmlUrlRef.current);
        previewHtmlUrlRef.current = url;
        setPreviewHtmlUrl(url);
      } catch (err: any) {
        const msg =
          err instanceof ApiError
            ? err.detail
            : err?.message === 'Failed to fetch'
              ? ja
                ? 'サーバーに接続できません（ネットワーク / CORS / API停止）'
                : 'Cannot reach API (network/CORS/backend down)'
              : err?.message || 'Preview generation failed';
        setPreviewError(msg);
      } finally {
        setPreviewBusy(false);
      }
    },
    [ja]
  );

  useEffect(() => {
    if (!draft || (activeTab !== 'preview' && activeTab !== 'split')) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void triggerPreviewFetch(draft.id, payload);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, draft?.id, payload, triggerPreviewFetch]);

  useEffect(() => {
    return () => {
      if (previewHtmlUrlRef.current) {
        URL.revokeObjectURL(previewHtmlUrlRef.current);
        previewHtmlUrlRef.current = null;
      }
    };
  }, []);

  // ── Initial Bootstrap Loader ────────────────────────────────────────────────
  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      void checkBackendHealth();
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      if (list.length > 0) {
        const full = await careerCenterClient.getDraft(list[0].id);
        applyDraft(full, true);
        await loadVersions(full.id);
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : err?.message || 'Failed to load CV Builder');
    } finally {
      setLoading(false);
    }
  }, [checkBackendHealth, applyDraft, loadVersions]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  // ── Keyboard Shortcuts (Ctrl+S / Cmd+S to Save) ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && !busy && draft) {
          void handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, busy, draft, payload, expectedUpdatedAt]);

  // ── Draft Actions: Create, Select, Delete ────────────────────────────────────
  const handleCreateDraft = async () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        ja
          ? '未保存の変更があります。保存せずに新規履歴書を作成しますか？'
          : 'You have unsaved changes. Discard and create a new CV?'
      );
      if (!confirmDiscard) return;
    }

    setBusy(true);
    setError(null);
    try {
      setMagicSuggestions([]);
      setMagicWarnings([]);
      const created = await careerCenterClient.createDraft({
        templateCode: 'RIREKISHO_JA',
        versionLabel: `履歴書-${new Date().toISOString().slice(0, 10)}`,
      });
      const full = await careerCenterClient.getDraft(created.id);
      applyDraft(full, true);
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      await loadVersions(full.id);
      addToast(
        ja ? '新規履歴書を作成しました（プロフィールから初期化）' : 'Created Japanese CV draft from profile',
        'success'
      );
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Create failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSelectDraft = async (id: string) => {
    if (draft?.id === id) return;
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        ja
          ? '現在の履歴書に未保存の変更があります。変更を破棄して別の下書きを開きますか？'
          : 'You have unsaved changes. Switch draft and discard current edits?'
      );
      if (!confirmDiscard) return;
    }

    setBusy(true);
    setError(null);
    try {
      const full = await careerCenterClient.getDraft(id);
      applyDraft(full, true);
      await loadVersions(full.id);
      setMagicSuggestions([]);
      setMagicWarnings([]);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Load failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDeleteModal = (id: string, label: string) => {
    setDeleteModalState({ isOpen: true, id, label });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModalState;
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.deleteDraft(id);
      setDeleteModalState({ isOpen: false, id: '', label: '' });

      const list = await careerCenterClient.listDrafts();
      setDrafts(list);

      if (draft?.id === id) {
        if (list.length > 0) {
          const next = await careerCenterClient.getDraft(list[0].id);
          applyDraft(next, true);
          await loadVersions(next.id);
        } else {
          setDraft(null);
          setPayload({});
          setExpectedUpdatedAt(null);
          setHasUnsavedChanges(false);
          setVersions([]);
          if (previewHtmlUrlRef.current) {
            URL.revokeObjectURL(previewHtmlUrlRef.current);
            previewHtmlUrlRef.current = null;
            setPreviewHtmlUrl(null);
          }
        }
      }
      addToast(ja ? '下書きを安全に削除しました' : 'Draft deleted successfully', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Delete failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Save Experience (With Optimistic Concurrency 409 Handling) ───────────────
  const handleSave = async (forceOverwrite = false) => {
    if (!draft) return;
    setSaveStatus('saving');
    setError(null);
    try {
      const updateBody: {
        payload: Record<string, unknown>;
        templateCode: string;
        expectedUpdatedAt?: string;
      } = {
        payload,
        templateCode: 'RIREKISHO_JA',
      };

      if (!forceOverwrite && expectedUpdatedAt) {
        updateBody.expectedUpdatedAt = expectedUpdatedAt;
      }

      const updated = await careerCenterClient.updateDraft(draft.id, updateBody);
      setDraft(updated);
      setExpectedUpdatedAt(updated.updatedAt || null);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setShowConflictModal(false);

      // Refresh drafts list timestamp
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);

      addToast(ja ? '履歴書を保存しました' : 'Japanese CV saved successfully', 'success');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setSaveStatus('conflict');
        setShowConflictModal(true);
        addToast(
          ja
            ? '別のウィンドウで変更された可能性があります (409 競合)'
            : 'Concurrent edit detected (HTTP 409). Edits held safely.',
          'error'
        );
      } else {
        setSaveStatus('error');
        const msg = err instanceof ApiError ? err.detail : err?.message || 'Save failed';
        setError(msg);
        addToast(msg, 'error');
      }
    }
  };

  const handleConflictReload = async () => {
    if (!draft) return;
    setBusy(true);
    setShowConflictModal(false);
    try {
      const full = await careerCenterClient.getDraft(draft.id);
      applyDraft(full, true);
      addToast(ja ? 'サーバーから最新状態を再読み込みしました' : 'Reloaded latest from server', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Reload failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleConflictForceOverwrite = async () => {
    setShowConflictModal(false);
    await handleSave(true);
  };

  // ── Profile Sync Execution ──────────────────────────────────────────────────
  const handleProfileSync = async (mode: ProfileSyncMode): Promise<CvSyncReport | undefined> => {
    if (!draft) return undefined;
    setBusy(true);
    setError(null);
    try {
      // Save pending edits first
      await careerCenterClient.updateDraft(draft.id, { payload });
      const updated = await careerCenterClient.refreshFromProfile(draft.id, {
        mode,
        replaceAll: mode === 'REPLACE_ALL',
      });
      applyDraft(updated, true);
      addToast(ja ? 'プロフィールを同期しました' : 'Candidate profile synchronized', 'success');
      return updated.syncReport;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Sync failed';
      setError(msg);
      addToast(msg, 'error');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  // ── AI Magic Fill Workflows ─────────────────────────────────────────────────
  const handleGenerateMagicFill = async () => {
    if (!draft) return;
    setMagicGenerating(true);
    try {
      // Save current state first
      await careerCenterClient.updateDraft(draft.id, { payload });
      const result = await careerCenterClient.magicFill(draft.id, {
        payload,
        companyContext: magicCompanyContext || undefined,
        allowCloud: true,
      });

      setMagicSuggestions(result.suggestions || []);
      setMagicWarnings([
        ...(result.warnings || []),
        ...(result.missingRequired || []).map((m) => `Missing in profile: ${m}`),
      ]);

      if ((result.suggestions || []).length === 0) {
        addToast(result.message || (ja ? '改善提案はありません' : 'No suggestions found'), 'info');
      } else {
        addToast(
          ja
            ? `Magic Fill: ${result.suggestions.length}件の提案を取得しました（未適用）`
            : `Magic Fill: ${result.suggestions.length} suggestions ready for review`,
          'info'
        );
      }
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.status === 502 || err.status === 503
            ? ja
              ? `AIプロバイダー障害 (${err.status}): しばらく経ってから再試行してください。`
              : `Cloud AI Service Unavailable (${err.status}). Please retry shortly.`
            : err.detail
          : err?.message || 'Magic Fill failed';
      addToast(msg, 'error');
    } finally {
      setMagicGenerating(false);
    }
  };

  const handleAcceptMagicOne = async (s: CvSuggestion) => {
    if (!draft) return;
    const sid = careerCenterClient.suggestionId(s);
    if (!sid) return;
    setMagicDeciding(true);
    try {
      const res = await careerCenterClient.decideMagicFill(draft.id, { acceptIds: [sid] });
      if (res.draft) {
        applyDraft(res.draft, false);
        setHasUnsavedChanges(true);
      }
      setMagicSuggestions((prev) => prev.filter((x) => careerCenterClient.suggestionId(x) !== sid));
      addToast(ja ? '提案を適用しました' : 'Suggestion accepted', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Accept failed', 'error');
    } finally {
      setMagicDeciding(false);
    }
  };

  const handleRejectMagicOne = async (s: CvSuggestion) => {
    if (!draft) return;
    const sid = careerCenterClient.suggestionId(s);
    if (!sid) return;
    setMagicDeciding(true);
    try {
      await careerCenterClient.decideMagicFill(draft.id, { rejectIds: [sid] });
      setMagicSuggestions((prev) => prev.filter((x) => careerCenterClient.suggestionId(x) !== sid));
      addToast(ja ? '提案を却下しました' : 'Suggestion rejected', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Reject failed', 'error');
    } finally {
      setMagicDeciding(false);
    }
  };

  const handleAcceptAllMagic = async () => {
    if (!draft || magicSuggestions.length === 0) return;
    setMagicDeciding(true);
    try {
      const res = await careerCenterClient.decideMagicFill(draft.id, { acceptAll: true });
      if (res.draft) {
        applyDraft(res.draft, false);
        setHasUnsavedChanges(true);
      }
      setMagicSuggestions([]);
      addToast(
        ja ? `すべての提案を適用しました (${res.accepted}件)` : `Accepted all suggestions (${res.accepted})`,
        'success'
      );
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Accept all failed', 'error');
    } finally {
      setMagicDeciding(false);
    }
  };

  // ── Single Field AI Polish ──────────────────────────────────────────────────
  const handleOpenSingleAi = (fieldKey: string, fieldLabel: string, currentValue: string) => {
    setSingleAiState({ isOpen: true, fieldKey, fieldLabel, currentValue });
  };

  const handleRequestSingleAi = async (
    fieldKey: string,
    instruction: string
  ): Promise<CvSuggestion | null> => {
    if (!draft) return null;
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const s = await careerCenterClient.aiAssist(draft.id, {
        fieldKey,
        instruction: instruction || undefined,
        allowCloud: true,
      });
      return s;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'AI Assist failed';
      addToast(msg, 'error');
      return null;
    }
  };

  const handleApplySingleAi = (proposedText: string) => {
    if (singleAiState.fieldKey) {
      handleFieldChange(singleAiState.fieldKey, proposedText);
      addToast(ja ? '提案を反映しました' : 'Applied AI suggestion', 'success');
    }
  };

  // ── Photo Upload & Management ───────────────────────────────────────────────
  const handleUploadPhoto = async (file: File) => {
    if (!draft || !file) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.uploadDraftPhoto(draft.id, file, false);
      applyDraft(updated, false);
      addToast(ja ? '証明写真を設定しました' : 'Photo uploaded for this CV', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Photo upload failed';
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUseProfilePhoto = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.useProfilePhotoForDraft(draft.id);
      applyDraft(updated, false);
      addToast(ja ? '候補者プロフィール写真を設定しました' : 'Using profile photo', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Failed to use profile photo', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.removeDraftPhoto(draft.id);
      applyDraft(updated, false);
      addToast(ja ? '証明写真を解除しました' : 'Photo removed', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Failed to remove photo', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Version Snapshot & Restore ──────────────────────────────────────────────
  const handleSaveSnapshot = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      await careerCenterClient.saveVersion(draft.id);
      await loadVersions(draft.id);
      addToast(ja ? 'バージョン履歴にスナップショットを保存しました' : 'Version snapshot saved', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Failed to save version', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!draft) return;
    const ok = window.confirm(
      ja
        ? 'このバージョンで現在の編集内容を復元しますか？（以降のバージョン履歴は保持されます）'
        : 'Restore this snapshot over the current draft? Subsequent history is safely preserved.'
    );
    if (!ok) return;

    setBusy(true);
    try {
      const restored = await careerCenterClient.restoreVersion(draft.id, versionId);
      applyDraft(restored, true);
      addToast(ja ? '指定バージョンを復元しました' : 'Version restored successfully', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Restore failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Education Sanitization ──────────────────────────────────────────────────
  const handleSanitizeEducation = async () => {
    if (!draft) return;
    const ok = window.confirm(
      ja
        ? '学歴データからOCRやテンプレート見出しの不要ノイズを自動除去しますか？'
        : 'Clean template noise/OCR artifacts from education list? Continue?'
    );
    if (!ok) return;

    setBusy(true);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const updated = await careerCenterClient.sanitizeEducation(draft.id);
      applyDraft(updated, true);
      addToast(ja ? '学歴ノイズを整理しました' : 'Education cleaned successfully', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Sanitize failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── PDF Export Execution ────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!draft) return;
    if (validation.hasErrors) {
      const msg = validation.errors.map((e) => `• [${e.label}] ${e.message}`).join('\n');
      alert(
        ja
          ? `PDF生成前に以下のオーバーフロー警告を解消してください:\n\n${msg}`
          : `Please fix overflow errors before export:\n\n${msg}`
      );
      return;
    }

    setExporting(true);
    setError(null);
    try {
      // Auto-save before export if unsaved
      if (hasUnsavedChanges) {
        await careerCenterClient.updateDraft(draft.id, { payload });
        setHasUnsavedChanges(false);
      }

      const meta = await careerCenterClient.exportDraft(draft.id, 'pdf');
      if (!meta?.documentId) throw new Error('Export did not return documentId');
      const dl = await careerCenterClient.downloadDocument(meta.documentId, meta.filename);
      addToast(
        ja ? `JIS規格 A4 PDFをダウンロードしました (${dl.bytes} bytes)` : `Downloaded PDF (${dl.bytes} bytes)`,
        'success'
      );
    } catch (err: any) {
      let msg = err instanceof ApiError ? err.detail : err?.message || 'Export failed';
      if (/Failed to fetch/i.test(String(msg))) {
        msg = ja
          ? 'サーバーに接続できません（ネットワーク / CORS / API停止）'
          : 'Cannot reach API (network/CORS/backend down)';
      }
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setExporting(false);
    }
  };

  // ── Render Loading State ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold">
          {ja ? 'TRON AI 履歴書ビルダーを読み込み中…' : 'Loading CV Builder V3…'}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <CvBuilderHeader
        hasUnsavedChanges={hasUnsavedChanges}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isBusy={busy}
        isExporting={exporting}
        hasErrors={validation.hasErrors}
        onSave={() => void handleSave()}
        onOpenMagicFill={() => setShowMagicFillModal(true)}
        onOpenProfileSync={() => setShowProfileSyncModal(true)}
        onExportPdf={() => void handleExportPdf()}
        ja={ja}
      />

      {/* 2. Global Validation Alert Bar */}
      {validation.hasErrors && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-800 space-y-1.5 shadow-xs">
          <div className="font-bold flex items-center gap-2 text-sm text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{ja ? '枠外オーバーフロー警告（PDF出力前に修正が必要です）' : 'A4 Capacity Overflow Detected:'}</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.errors.map((e, idx) => (
              <li key={idx}>
                <span className="font-bold">[{e.label}]</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Global Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-xs shadow-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      {/* 4. Main Body: Drafts Sidebar + (Editor / Preview / Split) */}
      {!draft ? (
        /* Empty State: No Draft Selected */
        <GlassCard className="p-16 text-center space-y-5 max-w-2xl mx-auto my-12">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <FileText className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              {ja ? '日本標準の履歴書を作成しましょう' : 'Create Your Japanese 履歴書'}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {ja
                ? 'TRON AI 履歴書ビルダーは、JIS規格に準拠した美しい2ページA4履歴書を作成できます。登録済みの候補者プロフィールからワンクリックでデータを初期化できます。'
                : 'Build an official 2-page JIS Japanese CV with candidate profile sync, AI Magic Fill, real-time A4 preview, and Chromium PDF rendering.'}
            </p>
          </div>
          <NeonButton onClick={() => void handleCreateDraft()} isLoading={busy} size="lg">
            {ja ? '新規履歴書を作成する' : 'Create New CV'}
          </NeonButton>
        </GlassCard>
      ) : (
        /* Active Draft Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar: 3 cols on 12-col grid */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <CvDraftsSidebar
              drafts={drafts}
              activeDraft={draft}
              versions={versions}
              validation={validation}
              isBusy={busy}
              onSelectDraft={(id) => void handleSelectDraft(id)}
              onCreateDraft={() => void handleCreateDraft()}
              onDeleteDraftClick={handleOpenDeleteModal}
              onSaveSnapshot={() => void handleSaveSnapshot()}
              onRestoreVersion={(vId) => void handleRestoreVersion(vId)}
              ja={ja}
            />
          </div>

          {/* Right Workspace: Dynamic based on activeTab */}
          {activeTab === 'split' ? (
            /* Split View: Editor (4 cols) + Live Preview (5 cols) */
            <>
              <div className="lg:col-span-4 xl:col-span-4 space-y-6">
                <CvEditor
                  payload={payload}
                  draft={draft}
                  validation={validation}
                  photoThumbUrl={photoThumbUrl}
                  isBusy={busy}
                  onFieldChange={handleFieldChange}
                  onUploadPhoto={(file) => void handleUploadPhoto(file)}
                  onUseProfilePhoto={() => void handleUseProfilePhoto()}
                  onRemovePhoto={() => void handleRemovePhoto()}
                  onOpenSingleAi={handleOpenSingleAi}
                  onSanitizeEducation={() => void handleSanitizeEducation()}
                  ja={ja}
                />
              </div>
              <div className="lg:col-span-4 xl:col-span-5 sticky top-6">
                <CvLivePreview
                  previewHtmlUrl={previewHtmlUrl}
                  isBusy={previewBusy}
                  isExporting={exporting}
                  previewError={previewError}
                  hasErrors={validation.hasErrors}
                  onRefresh={() => void triggerPreviewFetch(draft.id, payload)}
                  onExportPdf={() => void handleExportPdf()}
                  ja={ja}
                />
              </div>
            </>
          ) : activeTab === 'preview' ? (
            /* Full Preview View: 8 cols */
            <div className="lg:col-span-8 xl:col-span-9">
              <CvLivePreview
                previewHtmlUrl={previewHtmlUrl}
                isBusy={previewBusy}
                isExporting={exporting}
                previewError={previewError}
                hasErrors={validation.hasErrors}
                onRefresh={() => void triggerPreviewFetch(draft.id, payload)}
                onExportPdf={() => void handleExportPdf()}
                ja={ja}
              />
            </div>
          ) : (
            /* Standard Editor View: 8 cols */
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              <CvEditor
                payload={payload}
                draft={draft}
                validation={validation}
                photoThumbUrl={photoThumbUrl}
                isBusy={busy}
                onFieldChange={handleFieldChange}
                onUploadPhoto={(file) => void handleUploadPhoto(file)}
                onUseProfilePhoto={() => void handleUseProfilePhoto()}
                onRemovePhoto={() => void handleRemovePhoto()}
                onOpenSingleAi={handleOpenSingleAi}
                onSanitizeEducation={() => void handleSanitizeEducation()}
                ja={ja}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Modals & Dialogs ───────────────────────────────────────────────── */}
      {/* 1. Magic Fill Review Modal */}
      <CvMagicFillModal
        isOpen={showMagicFillModal}
        isGenerating={magicGenerating}
        isDeciding={magicDeciding}
        suggestions={magicSuggestions}
        warnings={magicWarnings}
        companyContext={magicCompanyContext}
        onCompanyContextChange={setMagicCompanyContext}
        onGenerate={handleGenerateMagicFill}
        onAcceptOne={handleAcceptMagicOne}
        onRejectOne={handleRejectMagicOne}
        onAcceptAll={handleAcceptAllMagic}
        onClose={() => setShowMagicFillModal(false)}
        ja={ja}
      />

      {/* 2. Candidate Profile Sync Modal */}
      <CvProfileSyncModal
        isOpen={showProfileSyncModal}
        isBusy={busy}
        onClose={() => setShowProfileSyncModal(false)}
        onConfirmSync={handleProfileSync}
        ja={ja}
      />

      {/* 3. 409 Concurrent Edit Conflict Modal */}
      <CvConflictModal
        isOpen={showConflictModal}
        isBusy={busy}
        onClose={() => setShowConflictModal(false)}
        onReloadLatest={() => void handleConflictReload()}
        onForceOverwrite={() => void handleConflictForceOverwrite()}
        ja={ja}
      />

      {/* 4. Delete Confirmation Modal */}
      <CvDeleteModal
        isOpen={deleteModalState.isOpen}
        draftLabel={deleteModalState.label}
        isBusy={busy}
        onClose={() => setDeleteModalState({ isOpen: false, id: '', label: '' })}
        onConfirm={() => void handleConfirmDelete()}
        ja={ja}
      />

      {/* 5. Single Field AI Assist Modal */}
      <CvSingleFieldAiModal
        isOpen={singleAiState.isOpen}
        fieldKey={singleAiState.fieldKey}
        fieldLabel={singleAiState.fieldLabel}
        currentValue={singleAiState.currentValue}
        isBusy={busy}
        onClose={() =>
          setSingleAiState({ isOpen: false, fieldKey: '', fieldLabel: '', currentValue: '' })
        }
        onApply={handleApplySingleAi}
        onRequestAssist={handleRequestSingleAi}
        ja={ja}
      />
    </div>
  );
};
