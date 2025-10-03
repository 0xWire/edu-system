'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '@/i18n/locales/en.json';
import uk from '@/i18n/locales/uk.json';

type Dictionaries = {
  en: typeof en;
  uk: typeof uk;
};

const dictionaries: Dictionaries = {
  en,
  uk
};

type Language = keyof Dictionaries;

type TranslationVars = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: TranslationVars) => string;
  availableLanguages: Language[];
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'edu-system-language';

const resolvePath = (dictionary: Record<string, unknown>, key: string): unknown => {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dictionary);
};

const applyVars = (template: string, vars?: TranslationVars): string => {
  if (!vars) return template;
  return template.replace(/\{(.*?)\}/g, (_, variable) => {
    const value = vars[variable.trim()];
    return value !== undefined ? String(value) : `{${variable}}`;
  });
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    if (storedLanguage === 'en' || storedLanguage === 'uk') {
      setLanguageState(storedLanguage);
      document.documentElement.lang = storedLanguage;
    } else {
      document.documentElement.lang = 'en';
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const translate = useCallback(
    (key: string, vars?: TranslationVars) => {
      const dictionary = dictionaries[language] ?? dictionaries.en;
      const value = resolvePath(dictionary as unknown as Record<string, unknown>, key);

      if (typeof value === 'string') {
        return applyVars(value, vars);
      }

      const fallbackValue = resolvePath(dictionaries.en as unknown as Record<string, unknown>, key);
      if (typeof fallbackValue === 'string') {
        return applyVars(fallbackValue, vars);
      }

      return key;
    },
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: translate,
      availableLanguages: Object.keys(dictionaries) as Language[]
    }),
    [language, setLanguage, translate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}
