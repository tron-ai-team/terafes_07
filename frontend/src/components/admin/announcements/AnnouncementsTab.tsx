import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  X,
  Send,
  Info,
} from 'lucide-react';
import { AdminAnnouncement, AnnouncementAudience, AnnouncementPriority, AnnouncementStatus } from '../../../types/admin';
import { CreateAnnouncementRequest } from '../../../services/admin/adminTypes';
import { adminTranslations } from '../../../locales/adminTranslations';

interface AnnouncementsTabProps {
  announcements: AdminAnnouncement[];
  onSaveAnnouncement: (data: CreateAnnouncementRequest & { id?: string }) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  lang: 'en' | 'ja';
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcements,
  onSaveAnnouncement,
  onDeleteAnnouncement,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'EXPIRED'>('ALL');
  const [editingAnnouncement, setEditingAnnouncement] = useState<AdminAnnouncement | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<AdminAnnouncement | null>(null);

  // Form state
  const [titleEn, setTitleEn] = useState('');
  const [titleJa, setTitleJa] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageJa, setMessageJa] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [priority, setPriority] = useState<AnnouncementPriority>('ANNOUNCEMENT');
  const [status, setStatus] = useState<AnnouncementStatus>('PUBLISHED');
  const [startAt, setStartAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endAt, setEndAt] = useState('');
  const [editorLangTab, setEditorLangTab] = useState<'en' | 'ja'>('en');

  const filteredAnnouncements = announcements.filter((a) => {
    if (activeFilter === 'ALL') return true;
    return a.status === activeFilter;
  });

  const openCreateDrawer = () => {
    setEditingAnnouncement(null);
    setTitleEn('');
    setTitleJa('');
    setMessageEn('');
    setMessageJa('');
    setAudience('ALL');
    setPriority('ANNOUNCEMENT');
    setStatus('PUBLISHED');
    setStartAt(new Date().toISOString().slice(0, 16));
    setEndAt('');
    setEditorLangTab('en');
    setIsCreateDrawerOpen(true);
  };

  const openEditDrawer = (a: AdminAnnouncement) => {
    setEditingAnnouncement(a);
    setTitleEn(a.titleEn);
    setTitleJa(a.titleJa);
    setMessageEn(a.messageEn);
    setMessageJa(a.messageJa);
    setAudience(a.audience);
    setPriority(a.priority);
    setStatus(a.status);
    setStartAt(a.startAt ? a.startAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setEndAt(a.endAt ? a.endAt.slice(0, 16) : '');
    setEditorLangTab('en');
    setIsCreateDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAnnouncement({
      id: editingAnnouncement?.id,
      titleEn,
      titleJa: titleJa || titleEn,
      messageEn,
      messageJa: messageJa || messageEn,
      audience,
      priority,
      status,
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : null,
    });
    setIsCreateDrawerOpen(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            {t.announcements.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.announcements.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.announcements.newAnnouncement}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: t.announcements.all, count: announcements.length },
          { key: 'PUBLISHED', label: t.announcements.published, count: announcements.filter((a) => a.status === 'PUBLISHED').length },
          { key: 'SCHEDULED', label: t.announcements.scheduled, count: announcements.filter((a) => a.status === 'SCHEDULED').length },
          { key: 'DRAFT', label: t.announcements.drafts, count: announcements.filter((a) => a.status === 'DRAFT').length },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key as any)}
            className={`
              px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5
              ${
                activeFilter === f.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }
            `}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === f.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredAnnouncements.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : a.status === 'SCHEDULED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {a.status}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    a.priority === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700'
                      : a.priority === 'MAINTENANCE'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {a.priority}
                </span>

                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Audience: {a.audience}
                </span>

                <span className="text-[11px] text-slate-400">
                  {new Date(a.startAt).toLocaleDateString()}
                  {a.endAt && ` — ${new Date(a.endAt).toLocaleDateString()}`}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {lang === 'ja' ? a.titleJa : a.titleEn}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {lang === 'ja' ? a.messageJa : a.messageEn}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setPreviewAnnouncement(a)}
                className="p-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5"
                title="Live In-App Preview"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.announcements.preview}</span>
              </button>

              <button
                type="button"
                onClick={() => openEditDrawer(a)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Edit Announcement"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteAnnouncement(a.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                title="Delete Announcement"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Drawer */}
      {isCreateDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingAnnouncement ? 'Edit Announcement' : t.announcements.newAnnouncement}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Language Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditorLangTab('en')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-all ${
                    editorLangTab === 'en' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  English Content (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorLangTab('ja')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-all ${
                    editorLangTab === 'ja' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  日本語 (JA)
                </button>
              </div>

              {editorLangTab === 'en' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Title (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="e.g. TRON AI 2.0 System Update"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Message Body (English Markdown) *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={messageEn}
                      onChange={(e) => setMessageEn(e.target.value)}
                      placeholder="Enter announcement description in markdown..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      タイトル (日本語)
                    </label>
                    <input
                      type="text"
                      value={titleJa}
                      onChange={(e) => setTitleJa(e.target.value)}
                      placeholder="例：TRON AI 2.0 システム更新のお知らせ"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      本文 (日本語 Markdown)
                    </label>
                    <textarea
                      rows={5}
                      value={messageJa}
                      onChange={(e) => setMessageJa(e.target.value)}
                      placeholder="お知らせ内容を記入してください..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.announcements.audienceField}
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="ALL">All Users</option>
                    <option value="FREE">Free Tier Users</option>
                    <option value="PREMIUM">Premium Tier Users</option>
                    <option value="ADMINS">Administrators Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {t.announcements.priorityField}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="INFO">INFO</option>
                    <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="CRITICAL">CRITICAL ALERT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date / Time</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiration (Optional)</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Publication Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AnnouncementStatus)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="PUBLISHED">Published (Immediately Active)</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDrawerOpen(false)}
                  className="px-4 py-2 font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingAnnouncement ? 'Save Updates' : t.announcements.publishNow}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live In-App Preview Modal */}
      {previewAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold">End-User Live In-App Display Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAnnouncement(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Render Simulated Banner as End-Users see it */}
            <div className="p-6 space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  previewAnnouncement.priority === 'CRITICAL'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : previewAnnouncement.priority === 'MAINTENANCE'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <Megaphone className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">
                    {lang === 'ja' ? previewAnnouncement.titleJa : previewAnnouncement.titleEn}
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {lang === 'ja' ? previewAnnouncement.messageJa : previewAnnouncement.messageEn}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center">
                This preview is rendered safely within the Admin Center and is not yet deployed to public production users.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
