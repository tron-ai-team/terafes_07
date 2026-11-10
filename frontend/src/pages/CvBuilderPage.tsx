import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import type { CvDraft, CvEducationPreview, CvSuggestion, CvTemplateSummary, CvVersionSummary } from '../types/careerCenter';
import { ApiError, getAccessToken } from '../services/httpClient';
import { CORE_API_URL } from '../config/api';
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
} from 'lucide-react';

const TEXT_FIELDS = [
  'fullName',
  'nameJa',
  'furigana',
  'dateOfBirth',
  'nationality',
  'addressText',
  'email',
  'phone',
  'selfPr',
  'careerGoals',
  'favoriteSubjects',
  'hobbies',
  'healthStatus',
  'extracurricular',
  'sports',
] as const;

const FIELD_LABELS_JA: Record<string, string> = {
  fullName: '氏名（ローマ字）',
  nameJa: '氏名',
  furigana: 'ふりがな',
  dateOfBirth: '生年月日',
  nationality: '国籍',
  addressText: '現住所',
  email: 'メール',
  phone: '電話番号',
  selfPr: '自己PR',
  careerGoals: '志望動機・キャリア目標',
  favoriteSubjects: '得意科目',
  hobbies: '趣味',
  healthStatus: '健康状態',
  extracurricular: '課外活動',
  sports: 'スポーツ',
};

const FIELD_LABELS_EN: Record<string, string> = {
  fullName: 'Full name',
  nameJa: 'Name (Japanese)',
  furigana: 'Furigana',
  dateOfBirth: 'Date of birth',
  nationality: 'Nationality',
  addressText: 'Address',
  email: 'Email',
  phone: 'Phone',
  selfPr: 'Professional summary / Self PR',
  careerGoals: 'Career goals',
  favoriteSubjects: 'Favorite subjects',
  hobbies: 'Hobbies',
  healthStatus: 'Health',
  extracurricular: 'Extracurricular',
  sports: 'Sports',
};

const RIREKISHO_EDU_CAP = 9;
const USER_FACING_TEMPLATES = new Set(['RIREKISHO_JA', 'RESUME_EN']);

function eduLabel(row: Record<string, unknown>): string {
  const school = String(row.schoolName || row.school || '').trim();
  const detail = String(row.detail || row.department || '').trim();
  if (school && detail && detail !== school) return `${school} ${detail}`;
  return school || detail || String(row.id || 'entry');
}

export const CvBuilderPage: React.FC = () => {
  const { addToast, uiLanguage, checkBackendHealth } = useApp();
  const ja = uiLanguage === 'ja';
  const [templates, setTemplates] = useState<CvTemplateSummary[]>([]);
  /** Template used only when creating a *new* draft */
  const [newTemplateCode, setNewTemplateCode] = useState('RIREKISHO_JA');
  const [drafts, setDrafts] = useState<CvDraft[]>([]);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<CvSuggestion | null>(null);
  const [magicSuggestions, setMagicSuggestions] = useState<CvSuggestion[]>([]);
  const [magicWarnings, setMagicWarnings] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistField, setAssistField] = useState('selfPr');
  const [assistInstruction, setAssistInstruction] = useState('');
  const [eduPreview, setEduPreview] = useState<CvEducationPreview | null>(null);
  const [selectedEduIds, setSelectedEduIds] = useState<string[]>([]);
  const [versions, setVersions] = useState<CvVersionSummary[]>([]);
  const [photoThumbUrl, setPhotoThumbUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const applyDraft = (full: CvDraft) => {
    setDraft(full);
    setPayload(full.payload || {});
    setEduPreview(full.educationPreview || null);
    // Only restore explicit export selection. Empty → backend exports full sanitized list.
    const exportIds = Array.isArray(full.payload?.educationExportIds)
      ? (full.payload!.educationExportIds as string[]).map(String)
      : [];
    setSelectedEduIds(exportIds);
    setPending(null);
    void refreshPhotoThumb(full);
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const [tpls, list] = await Promise.all([
        careerCenterClient.listTemplates(),
        careerCenterClient.listDrafts(),
      ]);
      setTemplates(tpls.filter((t) => USER_FACING_TEMPLATES.has(t.code)));
      setDrafts(list);
      if (list.length > 0) {
        const full = await careerCenterClient.getDraft(list[0].id);
        applyDraft(full);
        setNewTemplateCode(full.templateCode || 'RIREKISHO_JA');
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

  const draftTemplate = draft?.templateCode || newTemplateCode;
  const title = useMemo(() => {
    const t = templates.find((x) => x.code === draftTemplate);
    return t?.displayName || draftTemplate;
  }, [templates, draftTemplate]);

  const setField = (key: string, value: string) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const educationRows = useMemo(() => {
    const raw = Array.isArray(payload.education) ? (payload.education as Array<Record<string, unknown>>) : [];
    return raw;
  }, [payload.education]);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      clearPreview();
      setMagicSuggestions([]);
      setMagicWarnings([]);
      const created = await careerCenterClient.createDraft({
        templateCode: newTemplateCode,
        versionLabel: `draft-${Date.now()}`,
      });
      const full = await careerCenterClient.getDraft(created.id);
      applyDraft(full);
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      await loadVersions(full.id);
      addToast(ja ? '下書きを作成しました（プロフィールから初期化）' : 'Draft created from candidate profile', 'success');
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
        ? 'この下書きを削除しますか？（候補者プロフィールとテンプレートは削除されません）'
        : 'Delete this draft? Candidate Profile and templates are not deleted.'
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.deleteDraft(id);
      if (draft?.id === id) {
        clearPreview();
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

  const handleMagicFill = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
      // Language is determined by draft template on the backend — do not send UI locale.
      const result = await careerCenterClient.magicFill(draft.id, {
        payload: buildSavePayload(),
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

  const handlePreview = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
      const meta = await careerCenterClient.previewDraft(draft.id, 'pdf');
      if (!meta?.documentId) throw new Error('Preview did not return documentId');
      const path = `/api/v1/career/cv-builder/documents/${encodeURIComponent(meta.documentId)}/download`;
      const headers = new Headers();
      const token = getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(`${CORE_API_URL}${path}`, { headers, credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load preview PDF');
      const blob = await res.blob();
      if (!blob.size) throw new Error('Preview PDF empty');
      clearPreview();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      addToast(ja ? `プレビュー準備完了 (${blob.size} bytes)` : `Preview ready (${blob.size} bytes)`, 'success');
    } catch (err: any) {
      let msg = err instanceof ApiError ? err.detail : err?.message || 'Preview failed';
      if (/Gotenberg|PDF generation is temporarily unavailable/i.test(String(msg))) {
        msg = ja
          ? `PDFプレビュー不可（Gotenberg）。XLSXダウンロードは利用できます。\n${msg}`
          : `PDF preview unavailable (Gotenberg). XLSX download still works.\n${msg}`;
      }
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

  const buildSavePayload = () => {
    const next = { ...payload };
    if (selectedEduIds.length > 0) {
      next.educationExportIds = selectedEduIds;
    } else {
      delete next.educationExportIds;
      delete next.educationExportSelection;
    }
    return next;
  };

  const handleSave = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      // Do NOT send templateCode on ordinary save — prevents silent template corruption.
      const updated = await careerCenterClient.updateDraft(draft.id, {
        payload: buildSavePayload(),
      });
      applyDraft(updated);
      addToast(ja ? '下書きを保存しました' : 'Draft saved', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Save failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeTemplate = async () => {
    if (!draft) return;
    if (newTemplateCode === draft.templateCode) return;
    const ok = window.confirm(
      ja
        ? `テンプレートを ${draft.templateCode} → ${newTemplateCode} に変更しますか？本文データは保持されますが、出力形式が変わります。`
        : `Change template ${draft.templateCode} → ${newTemplateCode}? Payload is kept; export format changes.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await careerCenterClient.updateDraft(draft.id, {
        payload: buildSavePayload(),
        templateCode: newTemplateCode,
      });
      applyDraft(updated);
      addToast(ja ? 'テンプレートを更新しました' : 'Template updated', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Template change failed';
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
        ? '候補者プロフィールから下書きを更新します。氏名・生年月日・学歴などは上書きされます。下書き専用欄（趣味など）は保持されます。よろしいですか？'
        : 'Refresh this draft from Candidate Profile? Name, DOB, education, etc. will be overwritten. Draft-only fields (hobbies…) are kept. Continue?'
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
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

  const handleUploadPhoto = async (file: File | null) => {
    if (!draft || !file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await careerCenterClient.uploadDraftPhoto(draft.id, file, false);
      applyDraft(updated);
      addToast(ja ? '写真を設定しました' : 'Photo set for this CV', 'success');
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
      addToast(ja ? 'この履歴書から写真を外しました' : 'Photo removed from this CV', 'info');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSanitizeEducation = async () => {
    if (!draft) return;
    const ok = window.confirm(
      ja
        ? '学歴リストから履歴書テンプレートのノイズ（見出し・年月のみ等）を除去します。候補者プロフィールは変更しません。実行しますか？'
        : 'Remove OCR/template noise from this draft education list? Candidate Profile is not modified. Continue?'
    );
    if (!ok) return;
    setBusy(true);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
      const updated = await careerCenterClient.sanitizeEducation(draft.id);
      applyDraft(updated);
      const preview = await careerCenterClient.educationPreview(draft.id);
      setEduPreview(preview);
      addToast(
        ja
          ? `学歴を整理しました（残 ${Array.isArray(updated.payload?.education) ? (updated.payload!.education as unknown[]).length : 0} 件）`
          : `Education sanitized (${Array.isArray(updated.payload?.education) ? (updated.payload!.education as unknown[]).length : 0} kept)`,
        'success'
      );
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Sanitize failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAiAssist = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
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
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
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

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload: buildSavePayload() });
      if (draft.templateCode === 'RIREKISHO_JA') {
        const preview = await careerCenterClient.educationPreview(draft.id);
        setEduPreview(preview);
        if (preview.overflow) {
          throw new Error(
            ja
              ? `学歴がテンプレート上限（${RIREKISHO_EDU_CAP}）を超えています（出力予定 ${preview.exportCount} 件）。選択を減らすか学歴を整理してください。`
              : `Education exceeds template capacity (${RIREKISHO_EDU_CAP}); would export ${preview.exportCount}. Select fewer entries or sanitize.`
          );
        }
      }
      const meta = await careerCenterClient.exportDraft(draft.id, format);
      if (!meta?.documentId) {
        throw new Error('Export did not return documentId');
      }
      const dl = await careerCenterClient.downloadDocument(meta.documentId, meta.filename);
      addToast(
        ja
          ? `${format.toUpperCase()} をダウンロードしました (${dl.bytes} bytes)`
          : `Downloaded ${format.toUpperCase()} (${dl.bytes} bytes)`,
        'success'
      );
    } catch (err: any) {
      let msg = err instanceof ApiError ? err.detail : err?.message || 'Export failed';
      if (format === 'pdf' && /Gotenberg|PDF generation is temporarily unavailable/i.test(String(msg))) {
        msg = ja
          ? `PDF生成サービス(Gotenberg)が利用できません。XLSXは引き続きダウンロードできます。Docker で tron-gotenberg を起動してください。\n${msg}`
          : `PDF service (Gotenberg) unavailable. XLSX export still works — start tron-gotenberg via Docker.\n${msg}`;
      }
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleEdu = (id: string) => {
    setSelectedEduIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (draftTemplate === 'RIREKISHO_JA' && prev.length >= RIREKISHO_EDU_CAP) {
        addToast(ja ? `履歴書は最大 ${RIREKISHO_EDU_CAP} 件までです` : `履歴書 allows at most ${RIREKISHO_EDU_CAP}`, 'error');
        return prev;
      }
      return [...prev, id];
    });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading CV Builder…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <Link to="/career" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Career Center
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {ja ? 'AI CV Builder' : 'AI CV Builder'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {ja
              ? 'テンプレート選択 → 入力 → ✨ Magic Fill → 確認 → プレビュー → PDF / Excel ダウンロード'
              : 'Select template → Fill → ✨ Magic Fill → Review → Preview → Download PDF / Excel'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NeonButton onClick={() => void handleCreate()} disabled={busy}>
            {ja ? '新規CV' : 'New CV'}
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
          <NeonButton onClick={() => void handlePreview()} disabled={busy || !draft}>
            {ja ? 'プレビュー' : 'Preview'}
          </NeonButton>
          <NeonButton onClick={() => void handleExport('pdf')} disabled={busy || !draft} icon={<Download className="w-4 h-4" />}>
            PDF
          </NeonButton>
          <NeonButton onClick={() => void handleExport('xlsx')} disabled={busy || !draft} icon={<Download className="w-4 h-4" />}>
            Excel
          </NeonButton>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm whitespace-pre-wrap">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-4 space-y-3 lg:col-span-1">
          <div className="text-xs font-bold uppercase text-slate-500">
            {ja ? 'テンプレートを選択' : 'Select template'}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((t) => {
              const selected = newTemplateCode === t.code;
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setNewTemplateCode(t.code)}
                  className={`text-left rounded-xl border px-3 py-3 transition ${
                    selected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">{t.displayName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {t.code === 'RIREKISHO_JA'
                      ? ja
                        ? '日本企業向け履歴書'
                        : 'Japanese company applications'
                      : ja
                        ? '英語での応募向け'
                        : 'English job applications'}
                  </div>
                </button>
              );
            })}
          </div>
          {draft && (
            <div className="space-y-2">
              <div className="text-xs text-slate-600">
                {ja ? '編集中' : 'Editing'}: <span className="font-semibold text-slate-900">{title}</span>
              </div>
              {USER_FACING_TEMPLATES.has(newTemplateCode) && newTemplateCode !== draft.templateCode && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleChangeTemplate()}
                  className="text-xs font-semibold text-amber-700 underline"
                >
                  {ja ? `このテンプレートに切替` : `Switch to selected template`}
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy || !draft}
              onClick={() => void handleRefreshProfile()}
              className="text-xs font-semibold text-slate-600 underline"
            >
              {ja ? 'プロフィール反映' : 'Pull from profile'}
            </button>
            <button
              type="button"
              disabled={busy || !draft}
              onClick={() => void handleVersion()}
              className="text-xs font-semibold text-slate-600 underline"
            >
              {ja ? 'バージョン保存' : 'Save version'}
            </button>
          </div>
          <div className="text-xs font-bold uppercase text-slate-500 pt-2">{ja ? '下書き一覧' : 'Your drafts'}</div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {drafts.length === 0 && <div className="text-xs text-slate-400">No drafts yet</div>}
            {drafts.map((d) => (
              <div
                key={d.id}
                className={`flex items-start gap-1 rounded-lg px-2 py-2 text-xs border ${
                  draft?.id === d.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void handleSelectDraft(d.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-semibold text-slate-800 truncate">{d.versionLabel || d.id.slice(0, 8)}</div>
                  <div className="text-slate-500">
                    {d.templateCode === 'RIREKISHO_JA'
                      ? ja
                        ? '履歴書'
                        : 'Japanese CV'
                      : d.templateCode === 'RESUME_EN'
                        ? ja
                          ? '英語レジュメ'
                          : 'English Resume'
                        : d.templateCode}
                  </div>
                </button>
                <button
                  type="button"
                  title={ja ? '削除' : 'Delete'}
                  disabled={busy}
                  onClick={() => void handleDeleteDraft(d.id)}
                  className="shrink-0 text-red-600 hover:bg-red-50 rounded px-1.5 py-1 text-[11px] font-semibold"
                >
                  {ja ? '削除' : 'Del'}
                </button>
              </div>
            ))}
          </div>
          {versions.length > 0 && (
            <div className="space-y-1 pt-2">
              <div className="text-xs font-bold uppercase text-slate-500">Versions</div>
              {versions.slice(0, 5).map((v) => (
                <button
                  key={v.versionId}
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRestoreVersion(v.versionId)}
                  className="w-full text-left text-[11px] px-2 py-1 rounded border border-slate-100 hover:bg-slate-50"
                >
                  v{v.versionNumber} {v.versionLabel} ({v.templateCode})
                </button>
              ))}
            </div>
          )}
          <Link to="/career/profile" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> {ja ? '候補者プロフィール' : 'Candidate profile'}
          </Link>
        </GlassCard>

        <GlassCard className="p-4 space-y-3 lg:col-span-2">
          {!draft ? (
            <div className="text-sm text-slate-500 py-10 text-center">
              {ja ? 'テンプレートを選んで「新規下書き」を押してください。' : 'Select a template and create a draft.'}
            </div>
          ) : (
            <>
              {draftTemplate === 'RIREKISHO_JA' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-[90px] h-[120px] border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {photoThumbUrl ? (
                      <img src={photoThumbUrl} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center px-1 leading-tight">
                        {ja ? '写真\n40×30mm' : 'Photo\n4×3 cm'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      {ja ? '証明写真' : 'Profile photo'}
                    </div>
                    <p className="text-xs text-slate-500">
                      {ja
                        ? 'JPEG / PNG（最大2MB）。履歴書PDFの右上に配置されます。'
                        : 'JPEG / PNG (max 2MB). Placed top-right on the Japanese CV PDF.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                        className="text-xs font-semibold rounded-lg bg-slate-900 text-white px-3 py-1.5"
                      >
                        {ja ? '写真をアップロード' : 'Upload photo'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !draft.photo?.hasProfilePhoto}
                        onClick={() => void handleUseProfilePhoto()}
                        className="text-xs font-semibold rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                      >
                        {ja ? 'プロフィール写真を使う' : 'Use profile photo'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || !draft.photo?.available}
                        onClick={() => void handleRemovePhoto()}
                        className="text-xs font-semibold rounded-lg border border-red-200 text-red-700 px-3 py-1.5 disabled:opacity-40"
                      >
                        {ja ? '写真を外す' : 'Remove photo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEXT_FIELDS.map((key) => (
                  <label key={key} className={`block space-y-1 ${key === 'selfPr' || key === 'addressText' || key === 'careerGoals' ? 'md:col-span-2' : ''}`}>
                    <span className="text-[11px] font-semibold text-slate-600">
                      {(ja ? FIELD_LABELS_JA : FIELD_LABELS_EN)[key] || key}
                    </span>
                    {key === 'selfPr' || key === 'addressText' || key === 'careerGoals' ? (
                      <textarea
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[88px]"
                        value={String(payload[key] ?? '')}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    ) : (
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={String(payload[key] ?? '')}
                        onChange={(e) => setField(key, e.target.value)}
                        type={key === 'dateOfBirth' ? 'date' : 'text'}
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-800">
                    {ja ? '学歴' : 'Education'}
                  </div>
                  {draftTemplate === 'RIREKISHO_JA' && educationRows.length > RIREKISHO_EDU_CAP && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSanitizeEducation()}
                      className="text-xs font-semibold text-blue-700 underline"
                    >
                      {ja ? '学歴を整理' : 'Clean up list'}
                    </button>
                  )}
                </div>
                {draftTemplate === 'RIREKISHO_JA' && eduPreview?.overflow && (
                  <p className="text-xs text-amber-700 font-semibold">
                    {ja
                      ? `履歴書に載せられる学歴は最大 ${RIREKISHO_EDU_CAP} 件です。下から選んでください。`
                      : `Japanese CV holds up to ${RIREKISHO_EDU_CAP} education rows. Select which to include.`}
                  </p>
                )}
                {educationRows.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {ja
                      ? '学歴が空です。候補者プロフィールに追加するか「プロフィール反映」を使ってください。'
                      : 'No education rows. Add them in Candidate Profile or pull from profile.'}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-auto">
                    {educationRows.map((row, idx) => {
                      const id = String(row.id || idx);
                      const checked = selectedEduIds.length === 0 || selectedEduIds.includes(id);
                      return (
                        <label key={id} className="flex items-start gap-2 text-xs text-slate-700">
                          {draftTemplate === 'RIREKISHO_JA' ? (
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={selectedEduIds.includes(id)}
                              onChange={() => toggleEdu(id)}
                            />
                          ) : (
                            <span className="mt-0.5 text-slate-400">•</span>
                          )}
                          <span className={draftTemplate === 'RIREKISHO_JA' && selectedEduIds.length > 0 && !checked ? 'opacity-50' : ''}>
                            {eduLabel(row)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {magicSuggestions.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Magic Fill {ja ? '提案' : 'suggestions'} ({magicSuggestions.length})
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAcceptAllMagic()}
                      className="text-xs font-semibold text-emerald-700 underline"
                    >
                      {ja ? 'すべて適用' : 'Accept all'}
                    </button>
                  </div>
                  {magicWarnings.length > 0 && (
                    <ul className="text-xs text-amber-800 list-disc pl-4">
                      {magicWarnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                  <div className="space-y-3 max-h-72 overflow-auto">
                    {magicSuggestions.map((s) => (
                      <div key={careerCenterClient.suggestionId(s) || s.fieldKey} className="rounded-xl bg-white border border-slate-200 p-3 text-sm space-y-2">
                        <div className="text-xs font-semibold text-slate-500">
                          {s.fieldKey} {s.category ? `· ${s.category}` : ''}
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-slate-400">Original</div>
                          <p className="text-slate-600 whitespace-pre-wrap text-xs">{s.originalText || '—'}</p>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase text-slate-400">Suggested</div>
                          <p className="text-slate-900 whitespace-pre-wrap text-xs font-medium">{s.proposedText || '—'}</p>
                        </div>
                        {s.reason && <p className="text-[11px] text-slate-500">{s.reason}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAcceptMagicOne(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRejectMagicOne(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewUrl && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-800">{ja ? 'PDFプレビュー' : 'PDF Preview'}</div>
                    <button type="button" className="text-xs text-slate-500 underline" onClick={clearPreview}>
                      {ja ? '閉じる' : 'Close'}
                    </button>
                  </div>
                  <iframe title="CV PDF preview" src={previewUrl} className="w-full h-[480px] rounded-lg border border-slate-100" />
                </div>
              )}

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
                  <Sparkles className="w-4 h-4" /> {ja ? '単一欄のAI校正' : 'Polish one field'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={assistField}
                    onChange={(e) => setAssistField(e.target.value)}
                  >
                    {TEXT_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {(ja ? FIELD_LABELS_JA : FIELD_LABELS_EN)[f] || f}
                      </option>
                    ))}
                  </select>
                  <input
                    className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder={ja ? '指示（任意）' : 'Optional instruction'}
                    value={assistInstruction}
                    onChange={(e) => setAssistInstruction(e.target.value)}
                  />
                </div>
                <NeonButton onClick={() => void handleAiAssist()} disabled={busy} icon={<Sparkles className="w-4 h-4" />}>
                  {ja ? '提案を取得' : 'Get suggestion'}
                </NeonButton>
                {pending && (
                  <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2 text-sm">
                    <div className="text-xs font-semibold text-slate-500">Field: {pending.fieldKey}</div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-400">Original</div>
                      <p className="text-slate-600 whitespace-pre-wrap">{pending.originalText || '—'}</p>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-400">Suggested</div>
                      <p className="text-slate-900 whitespace-pre-wrap font-medium">{pending.proposedText || '—'}</p>
                    </div>
                    {pending.reason && <p className="text-xs text-slate-500">{pending.reason}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAccept()}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReject()}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
