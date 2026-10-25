import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import type { CvDraft, CvSuggestion, CvTemplateSummary } from '../types/careerCenter';
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
  'favoriteSubjects',
  'hobbies',
  'healthStatus',
  'extracurricular',
  'sports',
] as const;

export const CvBuilderPage: React.FC = () => {
  const { addToast, uiLanguage, selectedLanguage } = useApp();
  const ja = uiLanguage === 'ja';
  const [templates, setTemplates] = useState<CvTemplateSummary[]>([]);
  const [templateCode, setTemplateCode] = useState('RIREKISHO_JA');
  const [drafts, setDrafts] = useState<CvDraft[]>([]);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<CvSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistField, setAssistField] = useState('selfPr');
  const [assistInstruction, setAssistInstruction] = useState('');

  const loadBootstrap = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tpls, list] = await Promise.all([
        careerCenterClient.listTemplates(),
        careerCenterClient.listDrafts(),
      ]);
      setTemplates(tpls);
      setDrafts(list);
      if (list.length > 0) {
        const full = await careerCenterClient.getDraft(list[0].id);
        setDraft(full);
        setTemplateCode(full.templateCode || 'RIREKISHO_JA');
        setPayload(full.payload || {});
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

  const title = useMemo(() => {
    const t = templates.find((x) => x.code === templateCode);
    return t?.displayName || templateCode;
  }, [templates, templateCode]);

  const setField = (key: string, value: string) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await careerCenterClient.createDraft({
        templateCode,
        versionLabel: `draft-${Date.now()}`,
      });
      const full = await careerCenterClient.getDraft(created.id);
      setDraft(full);
      setPayload(full.payload || {});
      setPending(null);
      const list = await careerCenterClient.listDrafts();
      setDrafts(list);
      addToast(ja ? '下書きを作成しました（プロフィールから初期化）' : 'Draft created from candidate profile', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Create failed';
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
      setDraft(full);
      setTemplateCode(full.templateCode || templateCode);
      setPayload(full.payload || {});
      setPending(null);
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
        templateCode,
      });
      setDraft(updated);
      addToast(ja ? '下書きを保存しました' : 'Draft saved', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Save failed';
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
      await careerCenterClient.updateDraft(draft.id, { payload });
      const suggestion = await careerCenterClient.aiAssist(draft.id, {
        fieldKey: assistField,
        instruction: assistInstruction || undefined,
        language: selectedLanguage || (ja ? 'ja' : 'en'),
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
      setDraft(full);
      setPayload(full.payload || {});
      setPending(null);
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
      addToast(ja ? 'バージョンを保存しました' : 'Version snapshot saved', 'success');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Version save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await careerCenterClient.updateDraft(draft.id, { payload });
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
              ? '履歴書 / 職務経歴書 / English Resume。ExcelマスターからXLSX・PDFを生成します。'
              : 'Japanese 履歴書 / 職務経歴書 / English Resume with real XLSX & PDF export.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NeonButton onClick={() => void handleCreate()} disabled={busy}>
            {ja ? '新規下書き' : 'New draft'}
          </NeonButton>
          <NeonButton onClick={() => void handleSave()} disabled={busy || !draft} icon={<Save className="w-4 h-4" />}>
            {ja ? '保存' : 'Save'}
          </NeonButton>
          <NeonButton onClick={() => void handleVersion()} disabled={busy || !draft}>
            {ja ? 'バージョン' : 'Save version'}
          </NeonButton>
          <NeonButton onClick={() => void handleExport('xlsx')} disabled={busy || !draft} icon={<Download className="w-4 h-4" />}>
            XLSX
          </NeonButton>
          <NeonButton onClick={() => void handleExport('pdf')} disabled={busy || !draft} icon={<Download className="w-4 h-4" />}>
            PDF
          </NeonButton>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-4 space-y-3 lg:col-span-1">
          <div className="text-xs font-bold uppercase text-slate-500">Template</div>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.code} value={t.code}>
                {t.displayName}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-500">{title}</div>
          <div className="text-xs font-bold uppercase text-slate-500 pt-2">Drafts</div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {drafts.length === 0 && <div className="text-xs text-slate-400">No drafts yet</div>}
            {drafts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => void handleSelectDraft(d.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs border ${
                  draft?.id === d.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-800 truncate">{d.versionLabel || d.id.slice(0, 8)}</div>
                <div className="text-slate-500">{d.templateCode}</div>
              </button>
            ))}
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEXT_FIELDS.map((key) => (
                  <label key={key} className={`block space-y-1 ${key === 'selfPr' || key === 'addressText' ? 'md:col-span-2' : ''}`}>
                    <span className="text-[11px] font-semibold text-slate-600 uppercase">{key}</span>
                    {key === 'selfPr' || key === 'addressText' ? (
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
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
                  <Sparkles className="w-4 h-4" /> AI Assist
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={assistField}
                    onChange={(e) => setAssistField(e.target.value)}
                  >
                    {TEXT_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
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
