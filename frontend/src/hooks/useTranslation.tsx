import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SupportedLanguage, TranslationSchema, getTranslation, getInitialLanguage, LANGUAGE_STORAGE_KEY, LEGACY_LANGUAGE_STORAGE_KEY } from '../locales';

interface TranslationContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: TranslationSchema;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => getInitialLanguage());

  const setLang = useCallback((newLang: SupportedLanguage) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = getTranslation(lang);

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export function useTranslation(): TranslationContextType {
  const context = useContext(TranslationContext);
  if (context) {
    return context;
  }

  // Fallback if rendered outside TranslationProvider
  const initial = getInitialLanguage();
  return {
    lang: initial,
    setLang: () => {},
    t: getTranslation(initial),
  };
}

export default useTranslation;
