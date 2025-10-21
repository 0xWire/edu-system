'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/LanguageContext';
import { AssignmentService } from '@/services/assignment';
import { TestAttemptService } from '@/services/testAttempt';
import type { AssignmentView } from '@/types/assignment';
import type { AttemptSummary } from '@/types/testAttempt';

export default function DashboardAssignments() {
  const router = useRouter();
  const { t } = useI18n();

  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState(false);
  const [attemptsByAssignment, setAttemptsByAssignment] = useState<Record<string, AttemptSummary[]>>({});
  const [copiedAssignmentId, setCopiedAssignmentId] = useState<string | null>(null);

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

  const formatScore = useCallback((attempt: AttemptSummary) => {
    if (Number.isFinite(attempt.max_score) && attempt.max_score > 0) {
      const score = Math.round(attempt.score * 100) / 100;
      const max = Math.round(attempt.max_score * 100) / 100;
      return `${score} / ${max}`;
    }
    return '—';
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
                            <th className="pb-3 font-semibold">{t('dashboard.assignments.columns.completed')}</th>
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
      </main>
    </div>
  );
}
