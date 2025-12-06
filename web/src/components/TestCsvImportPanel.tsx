'use client';

import { useState, type ChangeEvent } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { TestService } from '@/services/test';

interface Props {
  onImported?: () => void;
}

export default function TestCsvImportPanel({ onImported }: Props) {
  const { t } = useI18n();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleDownload = async () => {
    setError(null);
    try {
      const blob = await TestService.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download template', err);
      setError(t('dashboard.importer.error'));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsImporting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await TestService.importFromCsv(file);
      if (result.success && result.data) {
        setMessage(
          t('dashboard.importer.success', {
            title: result.data.title,
            count: result.data.created_questions
          })
        );
        onImported?.();
      } else {
        setError(result.error || t('dashboard.importer.error'));
      }
    } catch (err) {
      console.error('Failed to import test', err);
      setError(t('dashboard.importer.error'));
    } finally {
      setIsImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-slate-100 shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            {t('dashboard.importer.title')}
          </p>
          <p className="mt-1 text-sm text-slate-300">{t('dashboard.importer.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-xl border border-indigo-400/40 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
          >
            {t('dashboard.importer.download')}
          </button>
          <label className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:text-white">
            {isImporting ? t('dashboard.importer.uploading') : t('dashboard.importer.selectFile')}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </label>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">{t('dashboard.importer.helper')}</p>

      {message && (
        <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
    </section>
  );
}
