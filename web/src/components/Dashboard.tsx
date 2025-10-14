'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/LanguageContext';
import { TestService } from '@/services/test';
import { AssignmentService } from '@/services/assignment';
import { TestAttemptService } from '@/services/testAttempt';
import type { GetTestResponse } from '@/types/test';
import type { AssignmentView } from '@/types/assignment';
import type { AttemptSummary } from '@/types/testAttempt';
import TestLaunchSettingsModal, { LaunchSettingsFormValues } from './TestLaunchSettingsModal';

interface InsightCard {
  label: string;
  value: string;
  helper: string;
}

export default function Dashboard() {
  const [tests, setTests] = useState<GetTestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState(false);
  const [attemptsByAssignment, setAttemptsByAssignment] = useState<Record<string, AttemptSummary[]>>({});
  const [copiedAssignmentId, setCopiedAssignmentId] = useState<string | null>(null);
  const [configuringTest, setConfiguringTest] = useState<GetTestResponse | null>(null);
  const [configuringError, setConfiguringError] = useState<string | null>(null);
  const [configuringLoading, setConfiguringLoading] = useState(false);

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

  const loadAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      const data = await AssignmentService.getMyAssignments();
      setAssignments(data);
      const entries = await Promise.all(
        data.map(async (assignment) => {
          try {
            const attempts = await TestAttemptService.listAttempts(assignment.assignment_id);
            return [assignment.assignment_id, attempts] as const;
          } catch (error) {
            console.error('Failed to fetch attempts for assignment', assignment.assignment_id, error);
            return [assignment.assignment_id, []] as const;
          }
        })
      );
      setAttemptsByAssignment(Object.fromEntries(entries));
      setAssignmentError(false);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
      setAttemptsByAssignment({});
      setAssignmentError(true);
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const openCreateTest = useCallback(() => {
    router.push('/tests/create');
  }, [router]);

  const buildShareLink = useCallback((assignment: AssignmentView) => {
    if (typeof window === 'undefined') {
      return assignment.share_url;
    }
    if (assignment.share_url.startsWith('http')) {
      return assignment.share_url;
    }
    return `${window.location.origin}${assignment.share_url}`;
  }, []);

  const formatDateTime = useCallback((value?: string) => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }, []);

  const formatScore = useCallback((attempt: AttemptSummary) => {
    if (Number.isFinite(attempt.max_score) && attempt.max_score > 0) {
      const score = Math.round(attempt.score * 100) / 100;
      const max = Math.round(attempt.max_score * 100) / 100;
      return `${score} / ${max}`;
    }
    return '—';
  }, []);

  useEffect(() => {
    void fetchTests();
    void loadAssignments();
  }, [fetchTests, loadAssignments]);

  useEffect(() => {
    if (!copiedAssignmentId) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setCopiedAssignmentId(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiedAssignmentId]);

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

  const attemptStatusLabels = useMemo(() => ({
    active: t('dashboard.assignments.status.active'),
    submitted: t('dashboard.assignments.status.submitted'),
    expired: t('dashboard.assignments.status.expired'),
    canceled: t('dashboard.assignments.status.canceled')
  }), [t]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleCopyAssignmentLink = useCallback(async (assignment: AssignmentView) => {
    try {
      const link = buildShareLink(assignment);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopiedAssignmentId(assignment.assignment_id);
      }
    } catch (error) {
      console.error('Failed to copy assignment link', error);
    }
  }, [buildShareLink]);

  const handleLaunchTest = (test: GetTestResponse) => {
    setConfiguringTest(test);
    setConfiguringError(null);
  };

  const handleGenerateShareLink = async (testId: string) => {
    try {
      const assignment = await AssignmentService.createAssignment({ test_id: testId });
      await loadAssignments();
      await handleCopyAssignmentLink(assignment);
    } catch (error) {
      console.error('Failed to generate assignment link', error);
    }
  };

  const handleLaunchSubmit = useCallback(async (values: LaunchSettingsFormValues) => {
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
      await loadAssignments();
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
      router.push(assignment.share_url);
    } catch (error) {
      console.error('Failed to start assignment', error);
      setConfiguringError(t('dashboard.launch.errors.create'));
    } finally {
      setConfiguringLoading(false);
    }
  }, [configuringTest, loadAssignments, router, t]);

  const handleCloseLaunchModal = useCallback(() => {
    if (configuringLoading) {
      return;
    }
    setConfiguringTest(null);
    setConfiguringError(null);
  }, [configuringLoading]);

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
    <>
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
                  onClick={openCreateTest}
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
                  onClick={openCreateTest}
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
                  onClick={openCreateTest}
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
                          onClick={() => handleLaunchTest(test)}
                          className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                        >
                          {t('common.actions.startTest')}
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

          <section className="mt-12 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-white">{t('dashboard.assignments.title')}</h3>
                <p className="text-sm text-slate-300">{t('dashboard.assignments.subtitle')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void loadAssignments();
                  }}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-white"
                >
                  {t('common.actions.refresh')}
                </button>
              </div>
            </div>

            {assignmentError ? (
              <div className="rounded-3xl border border-red-400/40 bg-red-500/10 px-8 py-6 text-red-100 shadow-2xl">
                <p className="text-sm font-semibold">{t('dashboard.assignments.errorTitle')}</p>
                <p className="mt-1 text-sm">{t('dashboard.assignments.errorDescription')}</p>
              </div>
            ) : assignmentsLoading ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-8 py-12 text-center text-slate-200 shadow-2xl">
                <p className="text-lg font-semibold text-white">{t('dashboard.assignments.emptyTitle')}</p>
                <p className="mt-2 text-sm text-slate-300">{t('dashboard.assignments.emptySubtitle')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {assignments.map((assignment) => {
                  const attempts = attemptsByAssignment[assignment.assignment_id] ?? [];
                  const shareLink = buildShareLink(assignment);
                  const isCopied = copiedAssignmentId === assignment.assignment_id;
                  const title = assignment.title?.trim() || t('dashboard.assignments.untitled');

                  return (
                    <article
                      key={assignment.assignment_id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.8)] backdrop-blur"
                    >
                      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.assignments.cardTag')}</p>
                          <h4 className="mt-2 text-xl font-semibold text-white">{title}</h4>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 md:max-w-md">
                          <label className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                            {t('dashboard.assignments.shareLabel')}
                          </label>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                              type="text"
                              value={shareLink}
                              readOnly
                              className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopyAssignmentLink(assignment);
                              }}
                              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                isCopied
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                  : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600'
                              }`}
                            >
                              {isCopied ? t('common.actions.copied') : t('common.actions.copyLink')}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        {attempts.length === 0 ? (
                          <p className="rounded-2xl bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
                            {t('dashboard.assignments.noAttempts')}
                          </p>
                        ) : (
                          <table className="min-w-full text-left text-sm text-slate-200">
                            <thead className="text-xs uppercase tracking-[0.2em] text-indigo-200">
                              <tr>
                                <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.participant')}</th>
                                <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.score')}</th>
                                <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.status')}</th>
                                <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.started')}</th>
                                <th className="pb-3 font-semibold">{t('dashboard.assignments.columns.completed')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {attempts.map((attempt) => {
                                const statusLabel = attemptStatusLabels[attempt.status as keyof typeof attemptStatusLabels] ?? attempt.status;
                                const participantKind =
                                  attempt.participant.kind === 'guest'
                                    ? t('dashboard.assignments.labels.guest')
                                    : t('dashboard.assignments.labels.registered');

                                return (
                                  <tr key={attempt.attempt_id} className="align-top">
                                    <td className="py-3 pr-6">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-white">{attempt.participant.name}</span>
                                        <span className="text-xs text-slate-400">
                                          {participantKind}
                                          {attempt.participant.kind === 'user' && attempt.participant.user_id
                                            ? ` · ID ${attempt.participant.user_id}`
                                            : ''}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 pr-6 text-white">{formatScore(attempt)}</td>
                                    <td className="py-3 pr-6">
                                      <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                                        {statusLabel}
                                      </span>
                                    </td>
                                    <td className="py-3 pr-6 text-slate-200">{formatDateTime(attempt.started_at)}</td>
                                    <td className="py-3 text-slate-200">{formatDateTime(attempt.submitted_at)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
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
        open={configuringTest !== null}
        test={configuringTest}
        submitting={configuringLoading}
        errorMessage={configuringError}
        onClose={handleCloseLaunchModal}
        onSubmit={handleLaunchSubmit}
      />
    </>
  );
}
