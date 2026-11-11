import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import type { CvDraft, CvEducationPreview, CvSuggestion, CvVersionSummary } from '../types/careerCenter';
import { ApiError } from '../services/httpClient';
import {
  FileText,
  Sparkles,
  Download,
  Save,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ArrowLeft,
  Camera,
  Plus,
  Trash2,
  Printer,
  Eye,
  Edit3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  validateRirekishoPayload,
  RIREKISHO_CAPACITIES,
  parseIsoDate,
  formatWareki,
  calculateAge,
  type EducationItem,
  type WorkItem,
  type CertificationItem,
} from '../templates/rirekishoCanonicalTemplate';

export const CvBuilderPage: React.FC = () => {
  const { addToast, uiLanguage, checkBackendHealth } = useApp();
  const ja = uiLanguage === 'ja';

  const [drafts, setDrafts] = useState<CvDraft[]>([]);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Magic Fill state (kept untouched)
  const [pending, setPending] = useState<CvSuggestion | null>(null);
  const [magicSuggestions, setMagicSuggestions] = useState<CvSuggestion[]>([]);
  const [magicWarnings, setMagicWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistField, setAssistField] = useState('selfPr');
  const [assistInstruction, setAssistInstruction] = useState('');
  const [eduPreview, setEduPreview] = useState<CvEducationPreview | null>(null);
  const [versions, setVersions] = useState<CvVersionSummary[]>([]);
  const [photoThumbUrl, setPhotoThumbUrl] = useState<string | null>(null);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const previewHtmlUrlRef = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Validation Calculation
  // -------------------------------------------------------------------------
  const validation = useMemo(() => {
    return validateRirekishoPayload(payload);
  }, [payload]);

  // Wareki live preview for Date of Birth
  const dobPreview = useMemo(() => {
    const d = parseIsoDate(payload.dateOfBirth as string);
    if (!d) return '';
    const now = parseIsoDate(new Date().toISOString().slice(0, 10));
    const age = calculateAge(d, now);
    return `${formatWareki(d)}${age ? `（満 ${age} 歳）` : ''}`;
  }, [payload.dateOfBirth]);

  // -------------------------------------------------------------------------
  // Photo & Preview Cleanup
  // -------------------------------------------------------------------------
  const clearPhotoThumb = () => {
    if (photoThumbUrl) URL.revokeObjectURL(photoThumbUrl);
    setPhotoThumbUrl(null);
  };

  const refreshPhotoThumb = async (full: CvDraft) => {
    clearPhotoThumb();
    if (!full.photo?.available) return;
    try {
      const url = await careerCenterClient.getDraftPhotoObjectUrl(full.id);
      if (url) setPhotoThumbUrl(url);
    } catch {
      // no photo
    }
  };

  useEffect(() => {
    return () => {
      if (photoThumbUrl) URL.revokeObjectURL(photoThumbUrl);
    };
  }, [photoThumbUrl]);

  // Live preview: authenticated Spring CvHtmlPdfRenderer HTML (same document as PDF).
  // Debounced; does not write the draft unless the user clicks Save.
  useEffect(() => {
    if (activeTab !== 'preview' || !draft) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setPreviewBusy(true);
        setPreviewError(null);
        try {
          const url = await careerCenterClient.previewHtml(draft.id, payload);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          if (previewHtmlUrlRef.current) URL.revokeObjectURL(previewHtmlUrlRef.current);
          previewHtmlUrlRef.current = url;
          setPreviewHtmlUrl(url);
        } catch (err: any) {
          if (cancelled) return;
          const msg =
            err instanceof ApiError
              ? err.detail
              : err?.message === 'Failed to fetch'
                ? ja
                  ? 'サーバーに接続できません（ネットワーク / CORS / API停止）。PDFレンダラ障害とは限りません。'
                  : 'Cannot reach API (network/CORS/backend down) — not necessarily a PDF renderer failure.'
                : err?.message || 'Preview failed';
          setPreviewError(msg);
        } finally {
          if (!cancelled) setPreviewBusy(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, draft?.id, payload, ja]);

  useEffect(() => {
    return () => {
      if (previewHtmlUrlRef.current) {
        URL.revokeObjectURL(previewHtmlUrlRef.current);
        previewHtmlUrlRef.current = null;
      }
    };
  }, []);

  const applyDraft = (full: CvDraft) => {
    setDraft(full);
    setPayload(full.payload || {});
    setEduPreview(full.educationPreview || null);
    setPending(null);
    void refreshPhotoThumb(full);
  };

  const loadVersions = async (draftId: string) => {
    try {
      const list = await careerCenterClient.listVersions(draftId);
      setVersions(list);
    } catch {
      setVersions([]);
    }
  };

  const loadBootstrap = async () => {
    setLoading(true);
    setError(null);
    try {
      void checkBackendHealth();
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      if (list.length > 0) {
        const full = await careerCenterClient.getDraft(list[0].id);
        applyDraft(full);
        await loadVersions(full.id);
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : err?.message || 'Failed to load CV Builder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBootstrap();
  }, []);

  const setField = (key: string, value: unknown) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  // -------------------------------------------------------------------------
  // Education List Handlers
  // -------------------------------------------------------------------------
  const educationList: EducationItem[] = useMemo(() => {
    return Array.isArray(payload.education) ? (payload.education as EducationItem[]) : [];
  }, [payload.education]);

  const updateEducationRow = (index: number, patch: Partial<EducationItem>) => {
    const next = [...educationList];
    next[index] = { ...next[index], ...patch };
    setField('education', next);
  };

  const addEducationRow = () => {
    const next = [
      ...educationList,
      {
        id: `edu-${Date.now()}`,
        schoolName: '',
        department: '',
        startYear: '',
        startMonth: '',
        endYear: '',
        endMonth: '',
        status: 'graduated',
      },
    ];
    setField('education', next);
  };

  const removeEducationRow = (index: number) => {
    const next = educationList.filter((_, i) => i !== index);
    setField('education', next);
  };

  // -------------------------------------------------------------------------
  // Work Experience Handlers
  // -------------------------------------------------------------------------
  const workList: WorkItem[] = useMemo(() => {
    return Array.isArray(payload.workExperience) ? (payload.workExperience as WorkItem[]) : [];
  }, [payload.workExperience]);

  const updateWorkRow = (index: number, patch: Partial<WorkItem>) => {
    const next = [...workList];
    next[index] = { ...next[index], ...patch };
    setField('workExperience', next);
  };

  const addWorkRow = () => {
    const next = [
      ...workList,
      {
        id: `work-${Date.now()}`,
        company: '',
        year: '',
        month: '',
        action: '入社',
      },
    ];
    setField('workExperience', next);
  };

  const removeWorkRow = (index: number) => {
    const next = workList.filter((_, i) => i !== index);
    setField('workExperience', next);
  };

  // -------------------------------------------------------------------------
  // Certifications Handlers
  // -------------------------------------------------------------------------
  const certList: CertificationItem[] = useMemo(() => {
    return Array.isArray(payload.certifications) ? (payload.certifications as CertificationItem[]) : [];
  }, [payload.certifications]);

  const updateCertRow = (index: number, patch: Partial<CertificationItem>) => {
    const next = [...certList];
    next[index] = { ...next[index], ...patch };
    setField('certifications', next);
  };

  const addCertRow = () => {
    const next = [
      ...certList,
      {
        id: `cert-${Date.now()}`,
        name: '',
        year: '',
        month: '',
      },
    ];
    setField('certifications', next);
  };

  const removeCertRow = (index: number) => {
    const next = certList.filter((_, i) => i !== index);
    setField('certifications', next);
  };

  // -------------------------------------------------------------------------
  // Draft Actions
  // -------------------------------------------------------------------------
  const handleCreate = async () => {
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
      applyDraft(full);
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      await loadVersions(full.id);
      addToast(ja ? '新規履歴書を作成しました（プロフィールから初期化）' : 'Created Japanese CV draft from profile', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Create failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    const ok = window.confirm(
      ja
        ? 'この履歴書下書きを削除しますか？（候補者プロフィールは保持されます）'
        : 'Delete this CV draft? Candidate Profile is preserved.'
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.deleteDraft(id);
      if (draft?.id === id) {
        setDraft(null);
        setPayload({});
        setMagicSuggestions([]);
        setVersions([]);
      }
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      if (list.length > 0 && draft?.id === id) {
        const full = await careerCenterClient.getDraft(list[0].id);
        applyDraft(full);
        await loadVersions(full.id);
      }
      addToast(ja ? '下書きを削除しました' : 'Draft deleted', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Delete failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSelectDraft = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const full = await careerCenterClient.getDraft(id);
      applyDraft(full);
      await loadVersions(full.id);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : err?.message || 'Load failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await careerCenterClient.updateDraft(draft.id, {
        payload,
      });
      applyDraft(updated);
      addToast(ja ? '履歴書を保存しました' : 'CV draft saved', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Save failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshProfile = async () => {
    if (!draft) return;
    const ok = window.confirm(
      ja
        ? '候補者プロフィールから履歴書を更新します。氏名・学歴・職歴などがプロフィール最新データで上書きされます。よろしいですか？'
        : 'Refresh CV from Candidate Profile? Personal info, education, and career will sync with profile.'
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const updated = await careerCenterClient.refreshFromProfile(draft.id, false);
      applyDraft(updated);
      addToast(ja ? 'プロフィールから反映しました' : 'Refreshed from Candidate Profile', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Refresh failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  // -------------------------------------------------------------------------
  // Photo Handling
  // -------------------------------------------------------------------------
  const handleUploadPhoto = async (file: File | null) => {
    if (!draft || !file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await careerCenterClient.uploadDraftPhoto(draft.id, file, false);
      applyDraft(updated);
      addToast(ja ? '証明写真を設定しました' : 'Photo set for this CV', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Photo upload failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleUseProfilePhoto = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.useProfilePhotoForDraft(draft.id);
      applyDraft(updated);
      addToast(ja ? 'プロフィール写真を使用します' : 'Using profile photo', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.removeDraftPhoto(draft.id);
      applyDraft(updated);
      addToast(ja ? '写真を外しました' : 'Photo removed', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  // -------------------------------------------------------------------------
  // Education Sanitizer
  // -------------------------------------------------------------------------
  const handleSanitizeEducation = async () => {
    if (!draft) return;
    const ok = window.confirm(
      ja
        ? '学歴リストから見出しや断片などの不要ノイズを除去します。実行しますか？'
        : 'Clean template noise/OCR artifacts from education list? Continue?'
    );
    if (!ok) return;
    setBusy(true);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const updated = await careerCenterClient.sanitizeEducation(draft.id);
      applyDraft(updated);
      const preview = await careerCenterClient.educationPreview(draft.id);
      setEduPreview(preview);
      addToast(ja ? '学歴を整理しました' : 'Education cleaned', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Sanitize failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  // -------------------------------------------------------------------------
  // Magic Fill & AI Assist (Intact)
  // -------------------------------------------------------------------------
  const handleMagicFill = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const result = await careerCenterClient.magicFill(draft.id, {
        payload,
        allowCloud: false,
      });
      setMagicSuggestions(result.suggestions || []);
      setMagicWarnings([...(result.warnings || []), ...(result.missingRequired || []).map((m) => `Missing: ${m}`)]);
      if ((result.suggestions || []).length === 0) {
        addToast(result.message || (ja ? '提案なし' : 'No suggestions'), 'info');
      } else {
        addToast(
          ja
            ? `Magic Fill: ${result.suggestions.length} 件の提案（未適用）`
            : `Magic Fill: ${result.suggestions.length} suggestion(s) pending approval`,
          'info'
        );
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Magic Fill failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptMagicOne = async (s: CvSuggestion) => {
    if (!draft) return;
    const sid = careerCenterClient.suggestionId(s);
    if (!sid) return;
    setBusy(true);
    try {
      const result = await careerCenterClient.decideMagicFill(draft.id, { acceptIds: [sid] });
      if (result.draft) applyDraft(result.draft);
      setMagicSuggestions((prev) => prev.filter((x) => careerCenterClient.suggestionId(x) !== sid));
      addToast(ja ? '提案を適用しました' : 'Suggestion accepted', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Accept failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectMagicOne = async (s: CvSuggestion) => {
    if (!draft) return;
    const sid = careerCenterClient.suggestionId(s);
    if (!sid) return;
    setBusy(true);
    try {
      await careerCenterClient.decideMagicFill(draft.id, { rejectIds: [sid] });
      setMagicSuggestions((prev) => prev.filter((x) => careerCenterClient.suggestionId(x) !== sid));
      addToast(ja ? '提案を却下しました' : 'Suggestion rejected', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Reject failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptAllMagic = async () => {
    if (!draft || magicSuggestions.length === 0) return;
    setBusy(true);
    try {
      const result = await careerCenterClient.decideMagicFill(draft.id, { acceptAll: true });
      if (result.draft) applyDraft(result.draft);
      setMagicSuggestions([]);
      addToast(ja ? `すべて適用 (${result.accepted})` : `Accepted all (${result.accepted})`, 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Accept all failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAiAssist = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const suggestion = await careerCenterClient.aiAssist(draft.id, {
        fieldKey: assistField,
        instruction: assistInstruction || undefined,
      });
      setPending(suggestion);
      addToast(ja ? 'AI提案を取得しました（未適用）' : 'AI suggestion ready (not applied yet)', 'info');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'AI assist failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!draft || !pending) return;
    const sid = careerCenterClient.suggestionId(pending);
    if (!sid) return;
    setBusy(true);
    try {
      await careerCenterClient.acceptSuggestion(draft.id, sid);
      const full = await careerCenterClient.getDraft(draft.id);
      applyDraft(full);
      addToast(ja ? '提案を適用しました' : 'Suggestion accepted', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Accept failed';
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!draft || !pending) return;
    const sid = careerCenterClient.suggestionId(pending);
    if (!sid) return;
    setBusy(true);
    try {
      await careerCenterClient.rejectSuggestion(draft.id, sid);
      setPending(null);
      addToast(ja ? '提案を却下しました' : 'Suggestion rejected', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Reject failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleVersion = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      await careerCenterClient.saveVersion(draft.id);
      await loadVersions(draft.id);
      addToast(ja ? 'バージョンを保存しました' : 'Version snapshot saved', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Version save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!draft) return;
    const ok = window.confirm(
      ja ? 'このバージョンで現在の下書きを上書きしますか？' : 'Restore this version over the current draft?'
    );
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.restoreVersion(draft.id, versionId);
      applyDraft(updated);
      addToast(ja ? 'バージョンを復元しました' : 'Version restored', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Restore failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  // -------------------------------------------------------------------------
  // PDF Export / Print
  // -------------------------------------------------------------------------
  const handleExportPdf = async () => {
    if (!draft) return;
    if (validation.hasErrors) {
      const msg = validation.errors.map((e) => e.message).join('\n');
      alert(ja ? `PDF生成前に以下の内容を修正してください:\n\n${msg}` : `Please fix errors before export:\n\n${msg}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
      const meta = await careerCenterClient.exportDraft(draft.id, 'pdf');
      if (!meta?.documentId) throw new Error('Export did not return documentId');
      const dl = await careerCenterClient.downloadDocument(meta.documentId, meta.filename);
      addToast(ja ? `PDFをダウンロードしました (${dl.bytes} bytes)` : `Downloaded PDF (${dl.bytes} bytes)`, 'success');
    } catch (err: any) {
      let msg = err instanceof ApiError ? err.detail : err?.message || 'Export failed';
      if (/Failed to fetch/i.test(String(msg))) {
        msg = ja
          ? 'サーバーに接続できません（ネットワーク / CORS / API停止）。PDFレンダラ障害とは限りません。'
          : 'Cannot reach API (network/CORS/backend down) — not necessarily a PDF renderer failure.';
      } else if (/Gotenberg|PDF generation is temporarily unavailable|Chromium/i.test(String(msg))) {
        const usePrint = window.confirm(
          ja
            ? `Gotenberg Chromium が利用できません。ブラウザの印刷（A4 PDF保存）を試しますか？\n（本番では Chromium 有効化が必要です）`
            : `Gotenberg Chromium unavailable. Try browser Print to PDF?\n(Production requires Chromium routes enabled.)`
        );
        if (usePrint) {
          setActiveTab('preview');
          window.setTimeout(() => handleBrowserPrint(), 500);
          return;
        }
      }
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleBrowserPrint = () => {
    if (previewIframeRef.current?.contentWindow) {
      previewIframeRef.current.contentWindow.focus();
      previewIframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {ja ? '履歴書ビルダーを読み込み中…' : 'Loading CV Builder…'}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Link to="/career" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Career Center
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
              {ja ? '日本標準 履歴書ビルダー' : 'Japanese 履歴書 Builder'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              JIS規格・A4 2枚組
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {ja
              ? '入力 → 保存 → リアルタイムA4プレビュー → PDF ダウンロード'
              : 'Enter Data → Save → Real-time A4 Preview → Download PDF'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <NeonButton onClick={() => void handleCreate()} disabled={busy}>
            {ja ? '新規履歴書' : 'New CV'}
          </NeonButton>
          <NeonButton onClick={() => void handleSave()} disabled={busy || !draft} icon={<Save className="w-4 h-4" />}>
            {ja ? '保存' : 'Save'}
          </NeonButton>
          <NeonButton
            onClick={() => void handleMagicFill()}
            disabled={busy || !draft}
            icon={<Sparkles className="w-4 h-4" />}
          >
            ✨ Magic Fill
          </NeonButton>
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'form' ? 'preview' : 'form')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {activeTab === 'form' ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {activeTab === 'form' ? (ja ? 'プレビュー表示' : 'View Preview') : (ja ? '編集画面に戻る' : 'Back to Editor')}
          </button>
          <NeonButton onClick={() => void handleExportPdf()} disabled={busy || !draft || validation.hasErrors} icon={<Download className="w-4 h-4" />}>
            PDF
          </NeonButton>
        </div>
      </div>

      {/* Capacity & Validation Alert Bar */}
      {validation.hasErrors && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 space-y-2">
          <div className="font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            {ja ? '枠外オーバーフロー警告（PDF生成前に修正してください）' : 'Capacity Overflow Errors (Must resolve for A4 print):'}
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {validation.errors.map((e, idx) => (
              <li key={idx} className="font-medium">
                <span className="font-bold">[{e.label}]</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.hasWarnings && !validation.hasErrors && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-800 space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            {ja ? 'レイアウト注意' : 'Layout Advisory:'}
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.warnings.map((w, idx) => (
              <li key={idx}>
                <span className="font-semibold">[{w.label}]</span> {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.hasWarnings && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            {ja ? '容量・レイアウト警告: ' : 'Capacity / layout warnings: '}
            {validation.warnings.map((w) => w.message).join(' / ')}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-wrap">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar: Drafts & Capacity Status */}
        <div className="lg:col-span-1 space-y-4">
          {/* Active Document Status Card */}
          <GlassCard className="p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {ja ? 'ドキュメント仕様' : 'Document Specs'}
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>{ja ? '日本標準 履歴書' : 'Japanese 履歴書'}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  JIS Standard
                </span>
              </div>
              <div className="text-slate-500">{ja ? 'A4 縦 2枚組 (595.28 × 841.89 pt)' : 'A4 Portrait 2-Page (JIS Form)'}</div>
              <div className="text-[11px] text-slate-400">
                {draft ? `ID: ${draft.id.slice(0, 8)}…` : ja ? '未作成' : 'No draft'}
              </div>
            </div>

            {/* Capacity Meter */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-600 uppercase">
                {ja ? '枠容量ステータス' : 'Form Capacities'}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{ja ? '学歴（展開行）' : 'Education'}</span>
                  <span
                    className={`font-mono font-bold ${
                      validation.capacities.educationLines > RIREKISHO_CAPACITIES.MAX_EDU_LINES
                        ? 'text-red-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {validation.capacities.educationLines} / {RIREKISHO_CAPACITIES.MAX_EDU_LINES}行
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{ja ? '職歴' : 'Work History'}</span>
                  <span
                    className={`font-mono font-bold ${
                      validation.capacities.workLines > RIREKISHO_CAPACITIES.MAX_WORK_LINES
                        ? 'text-red-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {validation.capacities.workLines} / {RIREKISHO_CAPACITIES.MAX_WORK_LINES}件
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{ja ? '免許・資格' : 'Certifications'}</span>
                  <span
                    className={`font-mono font-bold ${
                      validation.capacities.certLines > RIREKISHO_CAPACITIES.MAX_CERT_LINES
                        ? 'text-red-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {validation.capacities.certLines} / {RIREKISHO_CAPACITIES.MAX_CERT_LINES}件
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{ja ? '自己PR' : 'Self PR'}</span>
                  <span
                    className={`font-mono font-bold ${
                      validation.capacities.selfPrChars > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS
                        ? 'text-amber-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {validation.capacities.selfPrChars} / {RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS}文字
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={busy || !draft}
                onClick={() => void handleRefreshProfile()}
                className="text-left text-xs font-semibold text-blue-600 hover:text-blue-800 underline py-1"
              >
                {ja ? '候補者プロフィールから反映' : 'Pull from Candidate Profile'}
              </button>
              <button
                type="button"
                disabled={busy || !draft}
                onClick={() => void handleVersion()}
                className="text-left text-xs font-semibold text-slate-600 hover:text-slate-900 underline py-1"
              >
                {ja ? 'バージョン履歴をスナップショット保存' : 'Save version snapshot'}
              </button>
            </div>
          </GlassCard>

          {/* Drafts List Card */}
          <GlassCard className="p-4 space-y-3">
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              {ja ? '下書き一覧' : 'Your Drafts'}
            </div>
            <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
              {drafts.length === 0 && (
                <div className="text-xs text-slate-400 py-3 text-center">
                  {ja ? '下書きはありません' : 'No drafts yet'}
                </div>
              )}
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-start gap-1 rounded-xl p-2.5 text-xs border transition ${
                    draft?.id === d.id
                      ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void handleSelectDraft(d.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="font-semibold text-slate-800 truncate">
                      {d.versionLabel || `履歴書 ${d.id.slice(0, 6)}`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US') : ''}
                    </div>
                  </button>
                  <button
                    type="button"
                    title={ja ? '削除' : 'Delete'}
                    disabled={busy}
                    onClick={() => void handleDeleteDraft(d.id)}
                    className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {versions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  {ja ? '保存されたバージョン' : 'Saved Versions'}
                </div>
                {versions.slice(0, 4).map((v) => (
                  <button
                    key={v.versionId}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRestoreVersion(v.versionId)}
                    className="w-full text-left text-[11px] px-2 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span className="truncate">v{v.versionNumber} {v.versionLabel}</span>
                    <span className="text-slate-400 text-[10px]">復元</span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/career/profile"
                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> {ja ? 'マスタープロフィールを編集' : 'Candidate Profile'}
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Right Area: Form or Preview */}
        <div className="lg:col-span-3 space-y-4">
          {!draft ? (
            <GlassCard className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {ja ? '履歴書を作成しましょう' : 'Start your Japanese CV'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  {ja
                    ? '「新規履歴書」をクリックすると、あなたの候補者プロフィールから日本標準のA4 2枚組履歴書を自動生成します。'
                    : 'Click "New CV" to generate an official JIS 2-page Japanese 履歴書 from your candidate profile.'}
                </p>
              </div>
              <NeonButton onClick={() => void handleCreate()} disabled={busy}>
                {ja ? '新規履歴書を作成' : 'Create New CV'}
              </NeonButton>
            </GlassCard>
          ) : activeTab === 'preview' ? (
            /* Live A4 Preview Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">
                    {ja ? 'A4 2ページ リアルタイム プレビュー' : 'A4 2-Page Real-time Preview'}
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    （{ja ? '公式JIS座標・フォント仕様' : 'Canonical JIS Print Layout'}）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBrowserPrint}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> {ja ? '印刷' : 'Print'}
                  </button>
                  <NeonButton onClick={() => void handleExportPdf()} disabled={busy || validation.hasErrors} icon={<Download className="w-3.5 h-3.5" />}>
                    PDF
                  </NeonButton>
                </div>
              </div>

              {previewError && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-wrap">
                  {previewError}
                </div>
              )}
              {previewBusy && !previewHtmlUrl && (
                <div className="text-center text-sm text-slate-500 py-8 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {ja ? 'サーバーHTMLプレビューを生成中…' : 'Generating server HTML preview…'}
                </div>
              )}

              {/* Canonical HTML from Spring CvHtmlPdfRenderer (blob URL — JWT never in iframe src) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-2 sm:p-4 overflow-hidden shadow-inner flex justify-center relative">
                {previewBusy && previewHtmlUrl && (
                  <div className="absolute top-3 right-3 z-10 text-[11px] font-semibold bg-white/90 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
                    {ja ? '更新中…' : 'Refreshing…'}
                  </div>
                )}
                {previewHtmlUrl ? (
                  <iframe
                    ref={previewIframeRef}
                    title="Canonical Japanese 履歴書 Preview"
                    src={previewHtmlUrl}
                    sandbox="allow-same-origin allow-modals"
                    className="w-full max-w-[850px] h-[920px] rounded-xl border border-slate-300 shadow-md bg-white"
                  />
                ) : (
                  !previewBusy && (
                    <div className="w-full max-w-[850px] h-[320px] flex items-center justify-center text-sm text-slate-500">
                      {ja ? 'プレビューを表示できません' : 'Preview unavailable'}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            /* Form Editor Tab */
            <div className="space-y-4">
              {/* Photo Area Card */}
              <GlassCard className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="w-[100px] h-[133px] border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                    {photoThumbUrl ? (
                      <img src={photoThumbUrl} alt="本人証明写真" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="text-[11px] text-slate-400 text-center px-1 leading-snug">
                        {ja ? '証明写真\n縦4cm\n横3cm' : 'Photo\n40×30 mm'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                      {ja ? '証明写真（縦40mm × 横30mm）' : 'Profile Photo (30 × 40 mm)'}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {ja
                        ? 'JPEGまたはPNG（最大2MB）。履歴書の写真貼付枠にJIS規格の縦横比で精密に配置されます。'
                        : 'JPEG or PNG (max 2MB). Placed accurately in the 30 × 40 mm portrait frame.'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => void handleUploadPhoto(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => photoInputRef.current?.click()}
                        className="text-xs font-semibold rounded-lg bg-slate-900 text-white px-3.5 py-1.5 hover:bg-slate-800 transition"
                      >
                        {ja ? '写真をアップロード' : 'Upload photo'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !draft.photo?.hasProfilePhoto}
                        onClick={() => void handleUseProfilePhoto()}
                        className="text-xs font-semibold rounded-lg border border-slate-200 px-3.5 py-1.5 hover:bg-slate-50 transition disabled:opacity-40"
                      >
                        {ja ? 'プロフィール写真を使用' : 'Use profile photo'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !draft.photo?.available}
                        onClick={() => void handleRemovePhoto()}
                        className="text-xs font-semibold rounded-lg border border-red-200 text-red-700 px-3 py-1.5 hover:bg-red-50 transition disabled:opacity-40"
                      >
                        {ja ? '写真を外す' : 'Remove photo'}
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* 1. 基本情報 (Personal Information) */}
              <GlassCard className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800">{ja ? '基本情報' : 'Personal Information'}</h3>
                  {dobPreview && (
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {dobPreview}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '氏名' : 'Full Name (Japanese)'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="山田　太郎"
                      value={String(payload.nameJa ?? payload.fullName ?? '')}
                      onChange={(e) => setField('nameJa', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? 'ふりがな' : 'Furigana'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="やまだ　たろう"
                      value={String(payload.furigana ?? '')}
                      onChange={(e) => setField('furigana', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '生年月日' : 'Date of Birth'}</span>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={String(payload.dateOfBirth ?? '')}
                      onChange={(e) => setField('dateOfBirth', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      {ja ? '国籍（留学生のみ記入）' : 'Nationality (International candidates)'}
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder={ja ? '例: スリランカ、ベトナム、日本' : 'e.g. Japan'}
                      value={String(payload.nationality ?? '')}
                      onChange={(e) => setField('nationality', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '現住所 ふりがな' : 'Address Furigana'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="とうきょうとしんじゅくく..."
                      value={String(payload.addressFurigana ?? '')}
                      onChange={(e) => setField('addressFurigana', e.target.value)}
                    />
                  </label>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-600">{ja ? '郵便番号' : 'Postal Code'}</span>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="160-0022"
                        value={String(payload.postalCode ?? '')}
                        onChange={(e) => setField('postalCode', e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 md:col-span-2">
                      <span className="text-xs font-semibold text-slate-600">{ja ? '現住所' : 'Address Text'}</span>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="東京都新宿区新宿1-2-3 ○○マンション101"
                        value={String(payload.addressText ?? '')}
                        onChange={(e) => setField('addressText', e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '電話番号（固定）' : 'Landline'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="03-0000-0000"
                      value={String(payload.phone ?? '')}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '携帯電話' : 'Mobile Phone'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="090-0000-0000"
                      value={String(payload.mobile ?? '')}
                      onChange={(e) => setField('mobile', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">{ja ? 'E-mailアドレス' : 'Email Address'}</span>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="sample@example.com"
                      value={String(payload.email ?? '')}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                  </label>
                </div>

                {/* Optional Vacation Contact Accordion */}
                <details className="pt-2 text-xs text-slate-600">
                  <summary className="font-semibold cursor-pointer text-slate-700 hover:text-blue-600">
                    {ja ? '+ 休暇中の連絡先（現住所以外で希望する場合のみ記入）' : '+ Alternative / Holiday Contact (Optional)'}
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block space-y-1 md:col-span-2">
                      <span className="text-[11px] font-semibold text-slate-600">{ja ? '休暇中ふりがな' : 'Holiday Furigana'}</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                        value={String(payload.holidayFurigana ?? '')}
                        onChange={(e) => setField('holidayFurigana', e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600">{ja ? '休暇中住所' : 'Holiday Address'}</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                        value={String(payload.holidayAddress ?? '')}
                        onChange={(e) => setField('holidayAddress', e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600">{ja ? '休暇中電話' : 'Holiday Phone'}</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                        value={String(payload.holidayPhone ?? '')}
                        onChange={(e) => setField('holidayPhone', e.target.value)}
                      />
                    </label>
                  </div>
                </details>
              </GlassCard>

              {/* 2. 学歴 (Education History) */}
              <GlassCard className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{ja ? '学歴' : 'Education History'}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        validation.capacities.educationLines > RIREKISHO_CAPACITIES.MAX_EDU_LINES
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ja ? `展開行数: ${validation.capacities.educationLines} / 上限 ${RIREKISHO_CAPACITIES.MAX_EDU_LINES}行` : `${validation.capacities.educationLines} / max ${RIREKISHO_CAPACITIES.MAX_EDU_LINES} lines`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {educationList.length > 3 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSanitizeEducation()}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {ja ? '学歴整理（ノイズ除去）' : 'Clean list'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={addEducationRow}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> {ja ? '学歴を追加' : 'Add School'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  {ja
                    ? '入学と卒業が1行ずつ自動展開されます（最大9行まで収録可能）。'
                    : 'Each school automatically expands into Admission and Graduation rows (max 9 rows).'}
                </p>

                {educationList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {ja ? '学歴が未登録です。「学歴を追加」または「プロフィールから反映」を押してください。' : 'No education rows. Add one or pull from profile.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {educationList.map((edu, idx) => (
                      <div key={edu.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700">#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeEducationRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title={ja ? '削除' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            placeholder={ja ? '学校名（例: ○○大学○○学部）' : 'School name'}
                            value={String(edu.schoolName ?? '')}
                            onChange={(e) => updateEducationRow(idx, { schoolName: e.target.value })}
                          />
                          <select
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            value={String(edu.status ?? 'graduated')}
                            onChange={(e) => updateEducationRow(idx, { status: e.target.value })}
                          >
                            <option value="graduated">{ja ? '卒業' : 'Graduated'}</option>
                            <option value="expected">{ja ? '卒業見込み' : 'Expected graduation'}</option>
                            <option value="enrolled">{ja ? '在学中' : 'Enrolled / Studying'}</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <input
                            type="number"
                            className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                            placeholder={ja ? '入学年 (例: 2021)' : 'Start Year'}
                            value={edu.startYear ?? ''}
                            onChange={(e) => updateEducationRow(idx, { startYear: e.target.value })}
                          />
                          <input
                            type="number"
                            className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                            placeholder={ja ? '入学月 (例: 4)' : 'Start Month'}
                            value={edu.startMonth ?? ''}
                            onChange={(e) => updateEducationRow(idx, { startMonth: e.target.value })}
                          />
                          <input
                            type="number"
                            className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                            placeholder={ja ? '卒業年 (例: 2025)' : 'End Year'}
                            value={edu.endYear ?? ''}
                            onChange={(e) => updateEducationRow(idx, { endYear: e.target.value })}
                          />
                          <input
                            type="number"
                            className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                            placeholder={ja ? '卒業月 (例: 3)' : 'End Month'}
                            value={edu.endMonth ?? ''}
                            onChange={(e) => updateEducationRow(idx, { endMonth: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* 3. 職歴 (Work History - max 2 rows) */}
              <GlassCard className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{ja ? '職歴' : 'Work History'}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        validation.capacities.workLines > RIREKISHO_CAPACITIES.MAX_WORK_LINES
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {validation.capacities.workLines} / {RIREKISHO_CAPACITIES.MAX_WORK_LINES}件
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addWorkRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> {ja ? '職歴を追加' : 'Add Experience'}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  {ja
                    ? '職歴がない場合は空欄のままで構いません（履歴書上は自動で『な　し』と記載されます。最大2行）。'
                    : 'If empty, standard Japanese CV automatically outputs "なし" (None). Max 2 entries.'}
                </p>

                {workList.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {ja ? '職歴は現在「なし」として出力されます。' : 'Currently marked as "なし" (None).'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workList.map((work, idx) => (
                      <div key={work.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700">#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeWorkRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title={ja ? '削除' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            placeholder={ja ? '会社名（例: ○○株式会社）' : 'Company name'}
                            value={String(work.company ?? '')}
                            onChange={(e) => updateWorkRow(idx, { company: e.target.value })}
                          />
                          <input
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            placeholder={ja ? '区分/内容（例: 入社、アルバイト等）' : 'Status/Action'}
                            value={String(work.action ?? '')}
                            onChange={(e) => updateWorkRow(idx, { action: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] max-w-xs">
                          <input
                            type="number"
                            className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                            placeholder={ja ? '年 (例: 2023)' : 'Year'}
                            value={work.year ?? work.startYear ?? ''}
                            onChange={(e) => updateWorkRow(idx, { year: e.target.value })}
                          />
                          <input
                            type="number"
                            className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                            placeholder={ja ? '月 (例: 4)' : 'Month'}
                            value={work.month ?? work.startMonth ?? ''}
                            onChange={(e) => updateWorkRow(idx, { month: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* 4. 免許・資格 (Certifications - max 6 rows) */}
              <GlassCard className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{ja ? '免許・資格' : 'Certifications & Licenses'}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        validation.capacities.certLines > RIREKISHO_CAPACITIES.MAX_CERT_LINES
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {validation.capacities.certLines} / {RIREKISHO_CAPACITIES.MAX_CERT_LINES}件
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addCertRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> {ja ? '資格を追加' : 'Add Certification'}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  {ja
                    ? '取得年月と正式名称を記入します（最大6行）。'
                    : 'Enter year, month, and formal qualification name (max 6 entries).'}
                </p>

                {certList.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {ja ? '免許・資格は未登録です。' : 'No certifications entered.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certList.map((cert, idx) => (
                      <div key={cert.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700">#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeCertRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title={ja ? '削除' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            className="sm:col-span-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            placeholder={ja ? '資格名称（例: 基本情報技術者試験 合格、普通自動車第一種運転免許 取得）' : 'Qualification name'}
                            value={String(cert.name ?? '')}
                            onChange={(e) => updateCertRow(idx, { name: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <input
                              type="number"
                              className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                              placeholder={ja ? '年 (例: 2024)' : 'Year'}
                              value={cert.year ?? ''}
                              onChange={(e) => updateCertRow(idx, { year: e.target.value })}
                            />
                            <input
                              type="number"
                              className="rounded-lg border border-slate-200 px-2 py-1 bg-white"
                              placeholder={ja ? '月 (例: 10)' : 'Month'}
                              value={cert.month ?? ''}
                              onChange={(e) => updateCertRow(idx, { month: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* 5. 自己PR & 志望動機・特記事項 (Page 2) */}
              <GlassCard className="p-4 sm:p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    {ja ? '自己PR・志望動機・特記事項（2ページ目）' : 'Self PR & Motivation (Page 2)'}
                  </h3>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-600">{ja ? '自己PR' : 'Self PR'}</span>
                      <span
                        className={`text-[11px] font-mono ${
                          String(payload.selfPr || '').length > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {String(payload.selfPr || '').length} / 約{RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS}文字
                      </span>
                    </div>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[120px] focus:border-blue-500 focus:outline-none leading-relaxed"
                      placeholder={ja ? '私の強みは、課題に対して粘り強く原因を究明し、改善を継続できる点です。…' : 'Enter your self-PR...'}
                      value={String(payload.selfPr ?? '')}
                      onChange={(e) => setField('selfPr', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {ja ? '志望動機・本人希望・特記事項（上部継続枠）' : 'Motivation / Preferences / Additional Notes'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {String(payload.additionalNotes ?? '').length} 文字
                      </span>
                    </div>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[100px] focus:border-blue-500 focus:outline-none leading-relaxed"
                      placeholder={ja ? '貴社の理念に共感し、…（未入力時はマスタープロフィールの志望動機・希望条件が自動適用されます）' : 'Motivation, career goals, or personal requests...'}
                      value={String(payload.additionalNotes ?? payload.motivationCompany ?? payload.careerGoals ?? '')}
                      onChange={(e) => setField('additionalNotes', e.target.value)}
                    />
                  </label>
                </div>
              </GlassCard>

              {/* 6. 補足情報 (Page 2 下部) */}
              <GlassCard className="p-4 sm:p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    {ja ? '補足欄（得意科目・健康状態・趣味・特技・スポーツ）' : 'Supplemental Fields'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '得意科目' : 'Favorite Subjects'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder={ja ? '情報科学、データベース工学、数学' : 'Computer Science, Math'}
                      value={String(payload.favoriteSubjects ?? '')}
                      onChange={(e) => setField('favoriteSubjects', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '健康状態' : 'Health Status'}</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder={ja ? '任意（未入力のまま可）' : 'Optional — leave blank if unknown'}
                      value={String(payload.healthStatus ?? '')}
                      onChange={(e) => setField('healthStatus', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '趣味・特技' : 'Hobbies & Special Skills'}</span>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[72px] focus:border-blue-500 focus:outline-none"
                      placeholder={ja ? '読書（技術書）、自作キーボード設計' : 'Reading, building keyboards'}
                      value={String(payload.hobbies ?? '')}
                      onChange={(e) => setField('hobbies', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '愛好するスポーツ' : 'Sports'}</span>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[72px] focus:border-blue-500 focus:outline-none"
                      placeholder={ja ? '水泳（週2回）、フットサル' : 'Swimming, futsal'}
                      value={String(payload.sports ?? '')}
                      onChange={(e) => setField('sports', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">{ja ? '課外活動・他' : 'Extracurricular Activities'}</span>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[72px] focus:border-blue-500 focus:outline-none"
                      placeholder={ja ? '学園祭実行委員、学生ハッカソン出場' : 'Hackathons, committee'}
                      value={String(payload.extracurricular ?? '')}
                      onChange={(e) => setField('extracurricular', e.target.value)}
                    />
                  </label>
                </div>
              </GlassCard>

              {/* Magic Fill Suggestions Box (Intact) */}
              {magicSuggestions.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" /> Magic Fill {ja ? '提案' : 'Suggestions'} ({magicSuggestions.length})
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAcceptAllMagic()}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      {ja ? 'すべて適用' : 'Accept all'}
                    </button>
                  </div>
                  {magicWarnings.length > 0 && (
                    <ul className="text-xs text-amber-800 list-disc pl-4 space-y-0.5">
                      {magicWarnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  )}
                  <div className="space-y-3 max-h-72 overflow-auto">
                    {magicSuggestions.map((s) => (
                      <div
                        key={careerCenterClient.suggestionId(s) || s.fieldKey}
                        className="rounded-xl bg-white border border-slate-200 p-3 text-sm space-y-2 shadow-sm"
                      >
                        <div className="text-xs font-semibold text-slate-500">
                          {s.fieldKey} {s.category ? `· ${s.category}` : ''}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-slate-400 font-bold">Original</div>
                          <p className="text-slate-600 whitespace-pre-wrap text-xs">{s.originalText || '—'}</p>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-blue-500 font-bold">Suggested</div>
                          <p className="text-slate-900 whitespace-pre-wrap text-xs font-medium">{s.proposedText || '—'}</p>
                        </div>
                        {s.reason && <p className="text-[11px] text-slate-500 italic">{s.reason}</p>}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void handleAcceptMagicOne(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition"
                          >
                            <Check className="w-3.5 h-3.5" /> {ja ? '適用' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRejectMagicOne(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-300 transition"
                          >
                            <X className="w-3.5 h-3.5" /> {ja ? '却下' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Polish one field AI Box (Intact) */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
                  <Sparkles className="w-4 h-4" /> {ja ? '単一欄のAI校正' : 'Polish one field with AI'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                    value={assistField}
                    onChange={(e) => setAssistField(e.target.value)}
                  >
                    <option value="selfPr">{ja ? '自己PR' : 'Self PR'}</option>
                    <option value="additionalNotes">{ja ? '志望動機・特記事項' : 'Additional Notes'}</option>
                    <option value="favoriteSubjects">{ja ? '得意科目' : 'Favorite subjects'}</option>
                    <option value="hobbies">{ja ? '趣味・特技' : 'Hobbies'}</option>
                    <option value="sports">{ja ? '愛好するスポーツ' : 'Sports'}</option>
                  </select>
                  <input
                    className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                    placeholder={ja ? '指示（例: 丁寧に、エンジニア視点で）' : 'Optional instruction'}
                    value={assistInstruction}
                    onChange={(e) => setAssistInstruction(e.target.value)}
                  />
                </div>
                <NeonButton onClick={() => void handleAiAssist()} disabled={busy} icon={<Sparkles className="w-4 h-4" />}>
                  {ja ? 'AI提案を取得' : 'Get suggestion'}
                </NeonButton>
                {pending && (
                  <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2 text-sm shadow-sm">
                    <div className="text-xs font-semibold text-slate-500">Field: {pending.fieldKey}</div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold">Original</div>
                      <p className="text-slate-600 whitespace-pre-wrap text-xs">{pending.originalText || '—'}</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-blue-500 font-bold">Suggested</div>
                      <p className="text-slate-900 whitespace-pre-wrap text-xs font-medium">{pending.proposedText || '—'}</p>
                    </div>
                    {pending.reason && <p className="text-xs text-slate-500">{pending.reason}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleAccept()}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition"
                      >
                        <Check className="w-3.5 h-3.5" /> {ja ? '適用' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReject()}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-300 transition"
                      >
                        <X className="w-3.5 h-3.5" /> {ja ? '却下' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
