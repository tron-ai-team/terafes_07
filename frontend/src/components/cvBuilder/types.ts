import type {
  CvDraft,
  CvEducationPreview,
  CvSuggestion,
  CvSyncReport,
  CvVersionSummary,
} from '../../types/careerCenter';
import type {
  EducationItem,
  WorkItem,
  CertificationItem,
  RirekishoValidationResult,
} from '../../templates/rirekishoCanonicalTemplate';

export type CvBuilderTab = 'editor' | 'preview' | 'split' | 'drafts';

export type CvEditorSection =
  | 'personal'
  | 'address'
  | 'education'
  | 'work'
  | 'certifications'
  | 'selfPr'
  | 'motivation'
  | 'supplemental'
  | 'photo';

export interface CvBuilderState {
  drafts: CvDraft[];
  draft: CvDraft | null;
  payload: Record<string, unknown>;
  expectedUpdatedAt: string | null;
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'conflict' | 'error';
  lastSavedAt: Date | null;
  activeTab: CvBuilderTab;
  activeSection: CvEditorSection;
  validation: RirekishoValidationResult;
  loading: boolean;
  busy: boolean;
  error: string | null;
  previewBusy: boolean;
  previewError: string | null;
  previewHtmlUrl: string | null;
  photoThumbUrl: string | null;
  versions: CvVersionSummary[];
  magicSuggestions: CvSuggestion[];
  magicWarnings: string[];
  magicLoading: boolean;
  magicCompanyContext: string;
}

export type ProfileSyncMode = 'FILL_BLANK' | 'OVERWRITE_SCALARS' | 'REPLACE_ALL';

