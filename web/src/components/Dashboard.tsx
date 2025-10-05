'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { TestService } from '@/services/test';
import { AssignmentService } from '@/services/assignment';
import type { GetTestResponse } from '@/types/test';
import CreateTestForm from './CreateTestForm';

interface InsightCard {
  label: string;
  value: string;
  helper: string;
}

export default function Dashboard() {
  const [tests, setTests] = useState<GetTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await TestService.getMyTests();
      setTests(data);
      setHasConnectionError(false);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
      setHasConnectionError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTests();
  }, [fetchTests]);

  const metrics = useMemo<InsightCard[]>(() => {
    const totalTests = tests.length;
    const totalQuestions = tests.reduce((sum, test) => sum + (test.questions?.length || 0), 0);
    const uniqueAuthors = new Set(tests.map((test) => test.author).filter(Boolean));
    const averageQuestions = totalTests > 0 ? Math.round(totalQuestions / totalTests) : 0;

    return [
      {
        label: t('dashboard.stats.totalTests.label'),
        value: totalTests.toString(),
        helper:
          totalTests === 0
            ? t('dashboard.stats.totalTests.empty')
            : t('dashboard.stats.totalTests.default')
      },
      {
        label: t('dashboard.stats.totalQuestions.label'),
        value: totalQuestions.toString(),
        helper:
          totalQuestions === 0
            ? t('dashboard.stats.totalQuestions.empty')
            : t('dashboard.stats.totalQuestions.default')
      },
      {
        label: t('dashboard.stats.averageQuestions.label'),
        value: averageQuestions.toString(),
        helper:
          averageQuestions === 0
            ? t('dashboard.stats.averageQuestions.empty')
            : t('dashboard.stats.averageQuestions.default')
      },
      {
        label: t('dashboard.stats.authors.label'),
        value: uniqueAuthors.size.toString(),
        helper:
          uniqueAuthors.size === 0
            ? t('dashboard.stats.authors.empty')
            : t('dashboard.stats.authors.default')
      }
    ];
  }, [tests, t]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleStartTest = async (testId: string) => {
    try {
      const assignment = await AssignmentService.createAssignment({ test_id: testId });
      router.push(assignment.share_url);
    } catch (error) {
      console.error('Failed to start assignment', error);
    }
  };

  const displayName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    return parts.join(' ').trim();
  }, [user?.first_name, user?.last_name]);

  if (loading && tests.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center space-y-4 rounded-3xl bg-white/5 px-12 py-10 text-center shadow-2xl backdrop-blur">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-lg font-medium">{t('common.status.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.tag')}</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {displayName ? t('dashboard.greeting', { name: displayName }) : t('dashboard.greetingFallback')}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 sm:block">
              <p className="font-medium">{displayName || t('common.appName')}</p>
              <p className="text-xs uppercase tracking-widest text-indigo-300">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
            >
              {t('common.actions.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="mb-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.overviewTag')}</p>
            <h2 className="mt-3 text-3xl font-bold text-white">{t('dashboard.overviewTitle')}</h2>
            <p className="mt-4 max-w-2xl text-base text-slate-200">{t('dashboard.overviewBody')}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
              >
                {t('common.actions.createTest')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void fetchTests();
                }}
                className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                {t('common.actions.refresh')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 shadow-xl shadow-black/30"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-xs text-slate-300">{item.helper}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/30">
            {hasConnectionError ? (
              <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-red-200">{t('dashboard.connection.errorTitle')}</p>
                  <p className="text-sm text-red-100">{t('dashboard.connection.errorDescription')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void fetchTests();
                  }}
                  className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
                >
                  {t('dashboard.connection.retry')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-emerald-200">{t('dashboard.connection.successTitle')}</p>
                  <p className="text-sm text-emerald-100">
                    {t('dashboard.connection.successDescription', { count: tests.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs text-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {t('dashboard.connection.serviceOnline')}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-white">{t('dashboard.library.title')}</h3>
              <p className="text-sm text-slate-300">{t('dashboard.library.subtitle')}</p>
            </div>
            {!!tests.length && (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-white"
              >
                {t('dashboard.library.quickAdd')}
              </button>
            )}
          </div>

          {tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 px-8 py-12 text-center shadow-2xl">
              <p className="text-lg font-semibold text-white">{t('dashboard.library.emptyTitle')}</p>
              <p className="mt-2 max-w-md text-sm text-slate-300">{t('dashboard.library.emptyDescription')}</p>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="mt-6 rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
              >
                {t('dashboard.library.emptyAction')}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {tests.slice(0, 6).map((test) => {
                const questionCount = test.questions?.length || 0;

                return (
                  <article
                    key={test.test_id}
                    className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/90 p-6 text-slate-900 shadow-2xl transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-38px_rgba(30,41,59,0.55)]"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-indigo-500">
                        <span>{t('dashboard.library.testTag')}</span>
                        <span>{t('dashboard.library.questions', { count: questionCount })}</span>
                      </div>
                      <h4 className="mt-3 text-xl font-semibold text-slate-950">{test.title}</h4>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{test.description}</p>
                    </div>

                    <div className="mt-6 space-y-2 text-sm text-slate-500">
                      <p>
                        {t('dashboard.library.authorLabel')}:{' '}
                        <span className="font-medium text-slate-700">{test.author || t('dashboard.library.unknownAuthor')}</span>
                      </p>
                      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        {t('dashboard.library.ready')}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartTest(test.test_id)}
                        className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                      >
                        {t('common.actions.openTest')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartTest(test.test_id)}
                        className="rounded-xl border border-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-500 hover:text-white"
                      >
                        {t('common.actions.share')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.8)]">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-8 py-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">{t('dashboard.modal.tag')}</p>
                <h3 className="text-2xl font-semibold text-slate-900">{t('dashboard.modal.title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                <span className="sr-only">{t('dashboard.modal.close')}</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M6 14L14 6" />
                </svg>
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-8 py-6">
              <CreateTestForm
                onSuccess={() => {
                  setShowCreateForm(false);
                  void fetchTests();
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
