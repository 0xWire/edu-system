'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/LanguageContext';
import { AssignmentService } from '@/services/assignment';
import { TestAttemptService } from '@/services/testAttempt';
import type { AssignmentView } from '@/types/assignment';
import type { AttemptSummary, AttemptDetails } from '@/types/testAttempt';

export default function DashboardAssignments() {
  const router = useRouter();
  const { t } = useI18n();

  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState(false);
  const [attemptsByAssignment, setAttemptsByAssignment] = useState<Record<string, AttemptSummary[]>>({});
  const [copiedAssignmentId, setCopiedAssignmentId] = useState<string | null>(null);
  const [detailsState, setDetailsState] = useState<{
    open: boolean;
    loading: boolean;
    data: AttemptDetails | null;
    error: boolean;
  }>({
    open: false,
    loading: false,
    data: null,
    error: false
  });

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

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (!copiedAssignmentId) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setCopiedAssignmentId(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [copiedAssignmentId]);

  const handleCopyAssignmentLink = useCallback(
    async (assignment: AssignmentView) => {
      try {
        const link = assignment.share_url.startsWith('http')
          ? assignment.share_url
          : `${typeof window !== 'undefined' ? window.location.origin : ''}${assignment.share_url}`;
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(link);
          setCopiedAssignmentId(assignment.assignment_id);
        }
      } catch (error) {
        console.error('Failed to copy assignment link', error);
      }
    },
    []
  );

  const attemptStatusLabels = useMemo(
    () => ({
      active: t('dashboard.assignments.status.active'),
      submitted: t('dashboard.assignments.status.submitted'),
      expired: t('dashboard.assignments.status.expired'),
      canceled: t('dashboard.assignments.status.canceled')
    }),
    [t]
  );

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

  const formatScore = useCallback((score?: number, max?: number) => {
    if (Number.isFinite(max) && typeof max === 'number' && max > 0 && typeof score === 'number') {
      const safeScore = Math.round(score * 100) / 100;
      const safeMax = Math.round(max * 100) / 100;
      return `${safeScore} / ${safeMax}`;
    }
    return '—';
  }, []);

  const handleViewAttemptDetails = useCallback(async (attemptId: string) => {
    setDetailsState({ open: true, loading: true, data: null, error: false });
    try {
      const details = await TestAttemptService.getAttemptDetails(attemptId);
      setDetailsState({ open: true, loading: false, data: details, error: false });
    } catch (error) {
      console.error('Failed to load attempt details', error);
      setDetailsState({ open: true, loading: false, data: null, error: true });
    }
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsState({ open: false, loading: false, data: null, error: false });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.assignments.title')}</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">{t('dashboard.assignments.subtitle')}</h1>
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
              onClick={() => {
                void loadAssignments();
              }}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/10"
            >
              {t('common.actions.refresh')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {assignmentError ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 px-6 py-6 text-sm text-red-100">
            <p className="text-sm font-semibold">{t('dashboard.assignments.errorTitle')}</p>
            <p className="mt-1 text-sm">{t('dashboard.assignments.errorDescription')}</p>
          </div>
        ) : assignmentsLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="flex flex-col items-center space-y-4 rounded-3xl bg-white/5 px-10 py-8 text-center shadow-2xl backdrop-blur">
              <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
              <p className="text-sm text-slate-200">{t('common.status.loading')}</p>
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center text-slate-200">
            <p className="text-lg font-semibold text-white">{t('dashboard.assignments.emptyTitle')}</p>
            <p className="mt-2 text-sm text-slate-300">{t('dashboard.assignments.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {assignments.map((assignment) => {
              const title = assignment.title?.trim() || t('dashboard.assignments.untitled');
              const attempts = attemptsByAssignment[assignment.assignment_id] ?? [];
              return (
                <article
                  key={assignment.assignment_id}
                  className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.assignments.cardTag')}</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(assignment.manage_url ?? assignment.share_url)}
                      className="rounded-xl border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/40"
                    >
                      {t('dashboard.assignments.openManage')}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span>
                      {t('dashboard.assignments.shareLabel')}:{' '}
                      <button
                        type="button"
                        onClick={() => {
                          void handleCopyAssignmentLink(assignment);
                        }}
                        className="font-semibold text-indigo-200 hover:text-indigo-100"
                      >
                        {assignment.share_url}
                      </button>
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-indigo-200">
                      {t('dashboard.assignments.attemptsCount', { count: attempts.length })}
                    </span>
                    {copiedAssignmentId === assignment.assignment_id && (
                      <span className="text-xs text-emerald-300">{t('common.actions.copied')}</span>
                    )}
                  </div>

                  <div className="mt-5 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                    {attempts.length === 0 ? (
                      <div className="flex h-full items-center justify-center px-4 py-6 text-sm text-slate-300">
                        {t('dashboard.assignments.noAttempts')}
                      </div>
                    ) : (
                      <table className="min-w-full text-left text-sm text-slate-200">
                        <thead className="text-xs uppercase tracking-[0.2em] text-indigo-200">
                          <tr>
                            <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.participant')}</th>
                            <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.score')}</th>
                            <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.status')}</th>
                            <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.started')}</th>
                            <th className="pb-3 pr-6 font-semibold">{t('dashboard.assignments.columns.completed')}</th>
                            <th className="pb-3 font-semibold">{t('dashboard.assignments.columns.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {attempts.map((attempt) => {
                            const statusKey = attempt.status as keyof typeof attemptStatusLabels;
                            const statusLabel = attemptStatusLabels[statusKey] ?? attempt.status;
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
                                <td className="py-3 pr-6 text-white">{formatScore(attempt.score, attempt.max_score)}</td>
                                <td className="py-3 pr-6">
                                  <span className="inline-flex items-center rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="py-3 pr-6 text-slate-200">{formatDateTime(attempt.started_at)}</td>
                                <td className="py-3 pr-6 text-slate-200">{formatDateTime(attempt.submitted_at)}</td>
                                <td className="py-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleViewAttemptDetails(attempt.attempt_id);
                                    }}
                                    className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/20"
                                  >
                                    {t('dashboard.assignments.viewAnswers')}
                                  </button>
                                </td>
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
      </main>

      {detailsState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
            <button
              type="button"
              onClick={closeDetails}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-indigo-300 hover:text-white"
            >
              {t('common.actions.close')}
            </button>

            {detailsState.loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-100">
                  <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
                  <p className="text-sm">{t('dashboard.assignments.detailsLoading')}</p>
                </div>
              </div>
            ) : detailsState.error || !detailsState.data ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {t('dashboard.assignments.detailsError')}
              </div>
            ) : (
              <>
                {(() => {
                  const attempt = detailsState.data!.attempt;
                  const statusKey = attempt.status as keyof typeof attemptStatusLabels;
                  const statusLabel = attemptStatusLabels[statusKey] ?? attempt.status;
                  const participantName = attempt.participant.name;
                  return (
                    <div className="space-y-3 border-b border-white/10 pb-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                        {t('dashboard.assignments.detailsTitle')}
                      </p>
                      <h3 className="text-2xl font-semibold text-white">
                        {t('dashboard.assignments.detailsAttemptBy', { name: participantName })}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                          {statusLabel}
                        </span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                          {t('dashboard.assignments.columns.score')}: {formatScore(attempt.score, attempt.max_score)}
                        </span>
                        <span className="text-xs text-slate-300">
                          {t('dashboard.assignments.columns.started')}: {formatDateTime(attempt.started_at)}
                        </span>
                        <span className="text-xs text-slate-300">
                          {t('dashboard.assignments.columns.completed')}: {formatDateTime(attempt.submitted_at)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto pr-2">
                  {detailsState.data.answers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      {t('dashboard.assignments.noAttempts')}
                    </div>
                  ) : (
                    detailsState.data.answers.map((answer, index) => {
                      const hasSelection =
                        (answer.options && answer.options.some((opt) => opt.selected)) ||
                        !!answer.text_answer ||
                        !!answer.code_answer;
                      return (
                        <div
                          key={`${answer.question_id}-${index}`}
                          className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-100 shadow-inner shadow-black/20"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                                {t('testsDetail.questionLabel', { index: index + 1 })}
                              </p>
                              <h4 className="mt-1 text-lg font-semibold text-white">{answer.question_text}</h4>
                              {answer.kind && (
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                  {t('dashboard.assignments.answerKind', { kind: answer.kind })}
                                </p>
                              )}
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                                hasSelection
                                  ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                                  : 'border border-white/10 bg-white/10 text-slate-200'
                              }`}
                            >
                              {hasSelection
                                ? t('dashboard.assignments.detailsSelected')
                                : t('dashboard.assignments.detailsNoAnswer')}
                            </span>
                          </div>

                          {answer.image_url && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                              <img
                                src={answer.image_url}
                                alt={answer.question_text}
                                className="h-auto w-full object-cover"
                              />
                            </div>
                          )}

                          {answer.options && answer.options.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {answer.options.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                                    opt.selected
                                      ? 'border-emerald-400/60 bg-emerald-500/10'
                                      : 'border-white/10 bg-white/5'
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-medium text-white">{opt.option_text}</p>
                                    {opt.image_url && (
                                      <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                                        <img
                                          src={opt.image_url}
                                          alt={opt.option_text}
                                          className="h-32 w-full object-cover"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {opt.selected && (
                                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                                      {t('dashboard.assignments.detailsSelected')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {answer.text_answer && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                {t('dashboard.assignments.detailsTextAnswer')}
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-white">{answer.text_answer}</p>
                            </div>
                          )}

                          {answer.code_answer && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                {t('dashboard.assignments.detailsCodeAnswer', { lang: answer.code_answer.lang })}
                              </p>
                              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/80 p-3 text-xs text-emerald-100">
                                {answer.code_answer.body}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
