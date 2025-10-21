'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { TestService } from '@/services/test';
import { AssignmentService } from '@/services/assignment';
import type { GetTestResponse } from '@/types/test';
import type { AssignmentView } from '@/types/assignment';

interface InsightCard {
  label: string;
  value: string;
  helper: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const [tests, setTests] = useState<GetTestResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoadingStats(true);
      const [testData, assignmentData] = await Promise.all([
        TestService.getMyTests().catch((error) => {
          console.error('Failed to fetch tests:', error);
          return [] as GetTestResponse[];
        }),
        AssignmentService.getMyAssignments().catch((error) => {
          console.error('Failed to fetch assignments:', error);
          return [] as AssignmentView[];
        })
      ]);
      setTests(testData);
      setAssignments(assignmentData);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const metrics = useMemo<InsightCard[]>(() => {
    const totalTests = tests.length;
    const totalQuestions = tests.reduce((sum, test) => sum + (test.questions?.length || 0), 0);
    const averageQuestions = totalTests > 0 ? Math.round(totalQuestions / totalTests) : 0;
    const totalAssignments = assignments.length;

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
        label: t('dashboard.stats.assignments.label'),
        value: totalAssignments.toString(),
        helper:
          totalAssignments === 0
            ? t('dashboard.stats.assignments.empty')
            : t('dashboard.stats.assignments.default')
      },
      {
        label: t('dashboard.stats.averageQuestions.label'),
        value: averageQuestions.toString(),
        helper:
          averageQuestions === 0
            ? t('dashboard.stats.averageQuestions.empty')
            : t('dashboard.stats.averageQuestions.default')
      }
    ];
  }, [tests, assignments, t]);

  const displayName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name].filter(Boolean);
    return parts.join(' ').trim();
  }, [user?.first_name, user?.last_name]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.tag')}</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">
              {displayName ? t('dashboard.greeting', { name: displayName }) : t('dashboard.greetingFallback')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">{t('dashboard.home.subtitle')}</p>
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
        <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.home.overviewTag')}</p>
              <h2 className="mt-2 text-3xl font-bold text-white">{t('dashboard.home.overviewTitle')}</h2>
              <p className="mt-3 max-w-2xl text-base text-slate-200">{t('dashboard.home.overviewBody')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void fetchData();
                }}
                className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                {t('common.actions.refresh')}
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {loadingStats
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4 shadow-xl shadow-black/30"
                  >
                    <div className="h-3 w-24 rounded bg-slate-700/60" />
                    <div className="mt-4 h-6 w-16 rounded bg-slate-600/60" />
                    <div className="mt-3 h-3 w-32 rounded bg-slate-700/40" />
                  </div>
                ))
              : metrics.map((item) => (
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

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-3xl border border-indigo-500/40 bg-indigo-500/15 p-8 shadow-2xl shadow-indigo-500/20">
            <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{t('dashboard.quickAccess.tests.tag')}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{t('dashboard.quickAccess.tests.title')}</h3>
                <p className="mt-2 text-sm text-indigo-100">{t('dashboard.quickAccess.tests.body')}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/tests')}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-indigo-600 shadow-lg shadow-white/30 transition hover:-translate-y-0.5 hover:shadow-white/40"
                >
                  {t('dashboard.quickAccess.tests.action')}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/tests/create')}
                  className="rounded-2xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/20"
                >
                  {t('dashboard.quickAccess.tests.secondary')}
                </button>
              </div>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-emerald-500/15 p-8 shadow-2xl shadow-emerald-500/20">
            <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                  {t('dashboard.quickAccess.attempts.tag')}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{t('dashboard.quickAccess.attempts.title')}</h3>
                <p className="mt-2 text-sm text-emerald-100">{t('dashboard.quickAccess.attempts.body')}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/assignments')}
                className="mt-6 w-fit rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-600 shadow-lg shadow-white/30 transition hover:-translate-y-0.5 hover:shadow-white/40"
              >
                {t('dashboard.quickAccess.attempts.action')}
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
