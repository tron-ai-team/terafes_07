import { SupportedLanguage, LanguageInfo, TranslationSchema } from './types';
import { en } from './en';
import { ja } from './ja';
import { bn } from './bn';
import { ne } from './ne';
import { my } from './my';

export * from './types';

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'ja', label: 'Japanese', nativeName: '日本語' },
  { code: 'si', label: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'bn', label: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ne', label: 'Nepali', nativeName: 'नेपाली' },
  { code: 'my', label: 'Burmese', nativeName: 'မြန်မာဘာသာ' },
];

export const translations: Record<SupportedLanguage, TranslationSchema> = {
  en,
  si: en, // Preserve Sinhala AI selection with the existing English UI fallback.
  ja,
  bn,
  ne,
  my,
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'tron_selected_language';
export const LEGACY_LANGUAGE_STORAGE_KEY = 'tron_lang';

export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && LANGUAGES.some((l) => l.code === lang);
}

export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined' || !navigator.language) {
    return DEFAULT_LANGUAGE;
  }
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('si')) return 'si';
  if (browserLang.startsWith('bn')) return 'bn';
  if (browserLang.startsWith('ne')) return 'ne';
  if (browserLang.startsWith('my')) return 'my';
  return DEFAULT_LANGUAGE;
}

export function getInitialLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) || localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
    if (saved && isSupportedLanguage(saved)) {
      return saved;
    }
    return detectBrowserLanguage();
  }
  return DEFAULT_LANGUAGE;
}

export function getTranslation(lang: SupportedLanguage): TranslationSchema {
  return translations[lang] || translations.en;
}
