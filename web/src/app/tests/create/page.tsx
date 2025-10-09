'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CreateTestForm from '@/components/CreateTestForm';
import { useI18n } from '@/contexts/LanguageContext';

export default function CreateTestPage() {
  const router = useRouter();
  const { t } = useI18n();

  const handleSuccess = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">{t('createTest.tag')}</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{t('createTest.title')}</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">{t('createTest.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-white"
          >
            {t('common.actions.backToDashboard')}
          </button>
        </header>

        <CreateTestForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
