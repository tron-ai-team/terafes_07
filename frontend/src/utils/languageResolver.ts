/**
 * TRON AI — Centralized Unified Experience Language Resolver
 *
 * Single Source of Truth for language selection across TRON AI:
 * - Controls UI display behavior (Japanese for 'ja', English for all others)
 * - Controls AI conversational language (Chat, Voice, Interview, Agent explanations)
 * - Enforces zero mixed-language UI
 * - Provides native display labels and accessibility metadata
 */

export type SupportedLanguage = 'en' | 'ja' | 'si' | 'bn' | 'ne' | 'my';
export type UILocale = 'en' | 'ja';

export interface LanguageDefinition {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
  uiLocale: UILocale;
  aiLanguage: SupportedLanguage;
}

export interface LanguageResolution {
  selectedLanguage: SupportedLanguage;
  uiLocale: UILocale;
  aiLanguage: SupportedLanguage;
  label: string;
  nativeName: string;
}

/**
 * Canonical list of supported languages with strict native naming:
 * - English
 * - 日本語
 * - සිංහල
 * - বাংলা
 * - नेपाली
 * - မြန်မာ
 */
export const SUPPORTED_LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'en',
    label: 'English',
    nativeName: 'English',
    uiLocale: 'en',
    aiLanguage: 'en',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nativeName: '日本語',
    uiLocale: 'ja',
    aiLanguage: 'ja',
  },
  {
    code: 'si',
    label: 'Sinhala',
    nativeName: 'සිංහල',
    uiLocale: 'en',
    aiLanguage: 'si',
  },
  {
    code: 'bn',
    label: 'Bengali',
    nativeName: 'বাংলা',
    uiLocale: 'en',
    aiLanguage: 'bn',
  },
  {
    code: 'ne',
    label: 'Nepali',
    nativeName: 'नेपाली',
    uiLocale: 'en',
    aiLanguage: 'ne',
  },
  {
    code: 'my',
    label: 'Burmese',
    nativeName: 'မြန်မာ',
    uiLocale: 'en',
    aiLanguage: 'my',
  },
] as const;

/**
 * Storage key for global language selection
 */
export const LANGUAGE_STORAGE_KEY = 'tron_selected_language';
export const LEGACY_LANGUAGE_STORAGE_KEY = 'tron_ui_language';

/**
 * Type guard for supported language codes
 */
export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && SUPPORTED_LANGUAGES.some((l) => l.code === lang);
}

/**
 * Centralized Language Resolver
 *
 * Mapping Rules:
 * ja              → uiLocale = ja, aiLanguage = ja (Full Japanese UI + Japanese AI experience)
 * en, si, bn, ne, my → uiLocale = en, aiLanguage = <selected> (English UI + Target AI experience)
 */
export function resolveLanguage(code?: string | null): LanguageResolution {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  const def = match || SUPPORTED_LANGUAGES[0]; // fallback to English

  return {
    selectedLanguage: def.code,
    uiLocale: def.uiLocale,
    aiLanguage: def.aiLanguage,
    label: def.label,
    nativeName: def.nativeName,
  };
}

/**
 * Resolves default Interview language identifier for backend contracts
 */
export function resolveInterviewLanguage(code: SupportedLanguage): string {
  switch (code) {
    case 'ja':
      return 'japanese';
    case 'si':
      return 'sinhala';
    case 'bn':
      return 'bengali';
    case 'ne':
      return 'nepali';
    case 'my':
      return 'myanmar';
    case 'en':
    default:
      return 'english';
  }
}

/**
 * Truthful notice when voice audio synthesizer (VOICEVOX) only supports Japanese
 */
export function getVoiceNotice(code: SupportedLanguage): string | null {
  switch (code) {
    case 'ja':
      return null;
    case 'bn':
      return 'VOICEVOX শুধুমাত্র জাপানি ভয়েস সমর্থন করে। টেক্সট প্রতিক্রিয়া উপরে প্রদর্শিত হয়েছে।';
    case 'si':
      return 'VOICEVOX ජපන් හඬ පමණක් සපයයි. පෙළ ප්‍රතිචාරය ඉහතින් දක්වා ඇත.';
    case 'ne':
      return 'VOICEVOX ले केवल जापानी आवाज समर्थन गर्दछ। पाठ प्रतिक्रिया माथि देखाइएको छ।';
    case 'my':
      return 'VOICEVOX သည် ဂျပန်အသံကိုသာ ထောက်ပံ့ပေးသည်။ စာသားအဖြေကို အထက်တွင် ပြသထားသည်။';
    case 'en':
    default:
      return 'VOICEVOX Japanese-only notice: Spoken audio is unavailable for non-Japanese languages. Text reply displayed.';
  }
}
