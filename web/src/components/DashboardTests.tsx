'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/LanguageContext';
import { TestService } from '@/services/test';
import { AssignmentService } from '@/services/assignment';
import type { GetTestResponse } from '@/types/test';
import TestLaunchSettingsModal, { LaunchSettingsFormValues } from './TestLaunchSettingsModal';

export default function DashboardTests() {
  const router = useRouter();
  const { t } = useI18n();

  const [tests, setTests] = useState<GetTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [configuringTest, setConfiguringTest] = useState<GetTestResponse | null>(null);
  const [configuringError, setConfiguringError] = useState<string | null>(null);
  const [configuringLoading, setConfiguringLoading] = useState(false);

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

  const metrics = useMemo(() => {
    const totalTests = tests.length;
    const totalQuestions = tests.reduce((sum, test) => sum + (test.questions?.length || 0), 0);
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
      }
    ];
  }, [tests, t]);

  const openCreateTest = useCallback(() => {
    router.push('/tests/create');
  }, [router]);

  const handleLaunchTest = useCallback((test: GetTestResponse) => {
    setConfiguringTest(test);
    setConfiguringError(null);
  }, []);

  const handleViewTest = useCallback((testId: string) => {
    router.push(`/dashboard/tests/${testId}`);
  }, [router]);

  const handleGenerateShareLink = useCallback(
    async (testId: string) => {
      try {
        const assignment = await AssignmentService.createAssignment({ test_id: testId });
        const target = assignment.manage_url ?? assignment.share_url;
        router.push(target);
      } catch (error) {
        console.error('Failed to generate assignment link', error);
      }
    },
    [router]
  );

  const handleLaunchSubmit = useCallback(
    async (values: LaunchSettingsFormValues) => {
      if (!configuringTest) {
        return;
      }

      setConfiguringLoading(true);
      setConfiguringError(null);

      const durationSec = Math.max(Math.round(values.durationMinutes * 60), 0);
      const maxAttemptTimeSec = Math.max(Math.round(values.maxAttemptTimeMinutes * 60), 0);

      const updateResult = await TestService.updateTest(configuringTest.test_id, {
        settings: {
          duration_sec: durationSec,
          allow_guests: values.allowGuests,
          attempt_policy: {
            shuffle_questions: values.shuffleQuestions,
            shuffle_answers: values.shuffleAnswers,
            max_questions: values.maxQuestions,
            max_attempts: values.maxAttempts,
            question_time_limit_sec: values.questionTimeLimitSec,
            max_attempt_time_sec: maxAttemptTimeSec,
            require_all_answered: values.requireAllAnswered,
            lock_answer_on_confirm: values.lockAnswerOnConfirm,
            disable_copy: values.disableCopy,
            disable_browser_back: values.disableBrowserBack,
            show_elapsed_time: values.showElapsedTime,
            allow_navigation: values.allowNavigation,
            reveal_score_mode: values.revealScoreMode,
            reveal_solutions: values.revealSolutions
          }
        }
      });

      if (!updateResult.success) {
        setConfiguringError(updateResult.message ?? t('dashboard.launch.errors.update'));
        setConfiguringLoading(false);
        return;
      }

      try {
        const assignment = await AssignmentService.createAssignment({
          test_id: configuringTest.test_id,
          title: configuringTest.title
        });
        setTests((prev) =>
          prev.map((item) =>
            item.test_id === configuringTest.test_id
              ? {
                  ...item,
                  duration_sec: durationSec,
                  allow_guests: values.allowGuests,
                  attempt_policy: {
                    shuffle_questions: values.shuffleQuestions,
                    shuffle_answers: values.shuffleAnswers,
                    max_questions: values.maxQuestions,
                    max_attempts: values.maxAttempts,
                    question_time_limit_sec: values.questionTimeLimitSec,
                    max_attempt_time_sec: maxAttemptTimeSec,
                    require_all_answered: values.requireAllAnswered,
                    lock_answer_on_confirm: values.lockAnswerOnConfirm,
                    disable_copy: values.disableCopy,
                    disable_browser_back: values.disableBrowserBack,
                    show_elapsed_time: values.showElapsedTime,
                    allow_navigation: values.allowNavigation,
                    reveal_score_mode: values.revealScoreMode,
                    reveal_solutions: values.revealSolutions
                  }
                }
              : item
          )
        );
        setConfiguringTest(null);
        const target = assignment.manage_url ?? assignment.share_url;
        router.push(target);
      } catch (error) {
        console.error('Failed to start assignment', error);
        setConfiguringError(t('dashboard.launch.errors.create'));
      } finally {
        setConfiguringLoading(false);
      }
    },
    [configuringTest, router, t]
  );

  const handleCloseLaunchModal = useCallback(() => {
    if (configuringLoading) {
      return;
    }
    setConfiguringTest(null);
    setConfiguringError(null);
  }, [configuringLoading]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.library.title')}</p>
              <h1 className="mt-1 text-3xl font-semibold text-white">{t('dashboard.library.subtitle')}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-white"
              >
                {t('common.actions.backToDashboard')}
              </button>
              <button
                type="button"
                onClick={openCreateTest}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
              >
                {t('common.actions.createTest')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void fetchTests();
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                {t('common.actions.refresh')}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">
          <section className="mb-10 grid gap-6 md:grid-cols-3">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-4 shadow-xl shadow-black/30"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-xs text-slate-300">{item.helper}</p>
              </div>
            ))}
          </section>

          <section className="mb-10 rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/30">
            <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-white">
                  {hasConnectionError ? t('dashboard.connection.errorTitle') : t('dashboard.connection.successTitle')}
                </p>
                <p className="text-sm text-slate-200">
                  {hasConnectionError
                    ? t('dashboard.connection.errorDescription')
                    : t('dashboard.connection.successDescription', { count: tests.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void fetchTests();
                }}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                  hasConnectionError
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600'
                    : 'border border-emerald-400/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                }`}
              >
                {hasConnectionError ? t('dashboard.connection.retry') : t('common.actions.refresh')}
              </button>
            </div>
          </section>

          <section className="space-y-6">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="flex flex-col items-center space-y-4 rounded-3xl bg-white/5 px-10 py-8 text-center shadow-2xl backdrop-blur">
                  <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
                  <p className="text-sm text-slate-200">{t('common.status.loading')}</p>
                </div>
              </div>
            ) : tests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-slate-200">
                <h2 className="text-2xl font-semibold text-white">{t('dashboard.library.emptyTitle')}</h2>
                <p className="mt-2 text-sm text-slate-300">{t('dashboard.library.emptyDescription')}</p>
                <button
                  type="button"
                  onClick={openCreateTest}
                  className="mt-6 rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
                >
                  {t('dashboard.library.emptyAction')}
                </button>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {tests.map((test) => {
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
                          <span className="font-medium text-slate-700">
                            {test.author || t('dashboard.library.unknownAuthor')}
                          </span>
                        </p>
                        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          {t('dashboard.library.ready')}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewTest(test.test_id)}
                          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                        >
                          {t('dashboard.testsDetail.viewAction')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchTest(test)}
                          className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                        >
                          {t('dashboard.launch.actions.start')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleGenerateShareLink(test.test_id);
                          }}
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
      </div>

      <TestLaunchSettingsModal
        open={Boolean(configuringTest)}
        test={configuringTest}
        loading={configuringLoading}
        error={configuringError}
        onClose={handleCloseLaunchModal}
        onSubmit={handleLaunchSubmit}
      />
    </>
  );
}
