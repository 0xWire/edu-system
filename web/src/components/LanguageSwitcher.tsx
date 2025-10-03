'use client';

import { useMemo } from 'react';
import { useI18n } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage, t, availableLanguages } = useI18n();

  const languages = useMemo(
    () =>
      availableLanguages.map((code) => ({
        code,
        label: t(`language.${code}`)
      })),
    [availableLanguages, t]
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur">
      <span className="hidden sm:inline text-slate-300">{t('language.label')}:</span>
      <div className="flex gap-1">
        {languages.map(({ code, label }) => {
          const isActive = code === language;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              className={`rounded-xl px-3 py-1 font-semibold transition ${
                isActive
                  ? 'bg-indigo-500 text-white shadow shadow-indigo-500/40'
                  : 'bg-transparent text-slate-300 hover:bg-indigo-500/20'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
