'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/LanguageContext';
import { AssignmentService } from '@/services/assignment';
import { TestAttemptService } from '@/services/testAttempt';
import type { AssignmentView } from '@/types/assignment';
import type { AttemptSummary, AttemptDetails } from '@/types/testAttempt';

type CopyState = 'idle' | 'copied';

interface AssignmentManagePageProps {
  assignmentId: string;
}

export default function AssignmentManagePage({ assignmentId }: AssignmentManagePageProps) {
  const router = useRouter();
  const { t, language } = useI18n();

  const [assignment, setAssignment] = useState<AssignmentView | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [attemptSummaries, setAttemptSummaries] = useState<AttemptSummary[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState(false);
  const [isLoadingAssignment, setIsLoadingAssignment] = useState(true);
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

  useEffect(() => {
    let isMounted = true;
    const loadAssignment = async () => {
      try {
        setIsLoadingAssignment(true);
        const data = await AssignmentService.getAssignment(assignmentId);
        if (!isMounted) {
          return;
        }
        if (!data.is_owner) {
          router.replace(data.share_url);
          return;
        }
        setAssignment(data);
        if (typeof window !== 'undefined') {
          const absoluteShare = data.share_url.startsWith('http')
            ? data.share_url
            : `${window.location.origin}${data.share_url}`;
          setShareLink(absoluteShare);
        } else {
          setShareLink(data.share_url);
        }
      } catch (error) {
        console.error('Failed to fetch assignment', error);
        if (isMounted) {
          setAssignment(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAssignment(false);
        }
      }
    };

    void loadAssignment();

    return () => {
      isMounted = false;
    };
  }, [assignmentId, router]);

  useEffect(() => {
    if (copyState === 'copied') {
      const timeout = window.setTimeout(() => setCopyState('idle'), 2000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [copyState]);

  useEffect(() => {
    if (!assignment || !assignment.is_owner) {
      setAttemptSummaries([]);
      setAttemptsError(false);
      setAttemptsLoading(false);
      return;
    }

    let isMounted = true;
    const loadAttempts = async () => {
      try {
        setAttemptsLoading(true);
        const data = await TestAttemptService.listAttempts(assignment.assignment_id);
        if (!isMounted) {
          return;
        }
        setAttemptSummaries(data);
        setAttemptsError(false);
      } catch (error) {
        console.error('Failed to fetch assignment attempts', error);
        if (!isMounted) {
          return;
        }
        setAttemptSummaries([]);
        setAttemptsError(true);
      } finally {
        if (isMounted) {
          setAttemptsLoading(false);
        }
      }
    };

    void loadAttempts();

    return () => {
      isMounted = false;
    };
  }, [assignment]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(language), [language]);

  const formatUnit = useCallback(
    (value: number, unit: 'hour' | 'minute' | 'second') => {
      if (value <= 0) {
        return '';
      }

      if (language === 'uk') {
        const forms: Record<typeof unit, [string, string, string]> = {
          hour: ['година', 'години', 'годин'],
          minute: ['хвилина', 'хвилини', 'хвилин'],
          second: ['секунда', 'секунди', 'секунд']
        };
        const mod10 = value % 10;
        const mod100 = value % 100;
        let label = forms[unit][2];
        if (mod10 === 1 && mod100 !== 11) {
          label = forms[unit][0];
        } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
          label = forms[unit][1];
        }
        return `${numberFormatter.format(value)} ${label}`;
      }

      const englishLabels: Record<typeof unit, [string, string]> = {
        hour: ['hour', 'hours'],
        minute: ['minute', 'minutes'],
        second: ['second', 'seconds']
      };
      const [singular, plural] = englishLabels[unit];
      return `${numberFormatter.format(value)} ${value === 1 ? singular : plural}`;
    },
    [language, numberFormatter]
  );

  const formatTimeLimit = useCallback(
    (seconds?: number) => {
      if (!seconds || seconds <= 0) {
        return t('takeTest.timeLimitNone');
      }

      const total = Math.max(Math.floor(seconds), 0);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;

      const parts: string[] = [];
      if (hours > 0) {
        parts.push(formatUnit(hours, 'hour'));
      }
      if (minutes > 0) {
        parts.push(formatUnit(minutes, 'minute'));
      }
      if (hours === 0 && minutes === 0 && secs > 0) {
        parts.push(formatUnit(secs, 'second'));
      }

      if (parts.length === 0) {
        return t('takeTest.timeLimitNone');
      }

      return parts.join(' ');
    },
    [formatUnit, t]
  );

  const timeLimitSeconds = useMemo(() => {
    if (!assignment) {
      return 0;
    }
    if (typeof assignment.max_attempt_time_sec === 'number' && assignment.max_attempt_time_sec > 0) {
      return assignment.max_attempt_time_sec;
    }
    if (typeof assignment.duration_sec === 'number' && assignment.duration_sec > 0) {
      return assignment.duration_sec;
    }
    return 0;
  }, [assignment]);

  const timeLimitText = useMemo(
    () => (assignment ? formatTimeLimit(timeLimitSeconds) : '--'),
    [assignment, formatTimeLimit, timeLimitSeconds]
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

  const formatDateTime = useCallback(
    (value?: string) => {
      if (!value) {
        return '—';
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      return parsed.toLocaleString(language);
    },
    [language]
  );

  const formatScore = useCallback((score?: number, max?: number, pending?: number) => {
    if (Number.isFinite(max) && typeof max === 'number' && max > 0) {
      const safeScore = typeof score === 'number' ? Math.round(score * 100) / 100 : 0;
      const safeMax = Math.round(max * 100) / 100;
      const pendingPart = pending && pending > 0 ? ` + ?` : '';
      return `${safeScore}${pendingPart} / ${safeMax}`;
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

  const handleCopyShareLink = useCallback(() => {
    if (!shareLink) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(shareLink)
        .then(() => setCopyState('copied'))
        .catch((err) => {
          console.error('Failed to copy assignment link', err);
        });
    }
  }, [shareLink]);

  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  if (isLoadingAssignment) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
          <div className="flex flex-col items-center space-y-4 rounded-3xl bg-white/5 px-12 py-10 text-center shadow-2xl backdrop-blur">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-lg font-medium">{t('common.status.loading')}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!assignment || !assignment.is_owner) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">{t('takeTest.missingTag')}</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">{t('takeTest.missingTitle')}</h1>
            <p className="mt-3 text-sm text-slate-200">{t('takeTest.missingDescription')}</p>
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="mt-6 rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
            >
              {t('common.actions.backToDashboard')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const title = assignment.title?.trim() || t('dashboard.assignments.untitled');

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">{t('takeTest.ownerTag')}</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{t('takeTest.ownerTitle')}</h1>
          <p className="mt-3 text-sm text-slate-200">{t('takeTest.ownerDescription')}</p>

          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('takeTest.detailsTag')}</p>
              <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{t('takeTest.timeLimitLabel')}</p>
                  <p className="mt-2 text-sm text-slate-100">{timeLimitText}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('takeTest.shareTag')}</p>
              <h2 className="mt-3 text-xl font-semibold text-white">{t('takeTest.shareTitle')}</h2>
              <p className="mt-2 text-sm text-slate-200">{t('takeTest.shareDescription')}</p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    copyState === 'copied'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600'
                  }`}
                >
                  {copyState === 'copied' ? t('common.actions.copied') : t('common.actions.copyLink')}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
                    {t('takeTest.ownerAttemptsTitle')}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{title}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                {attemptsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                  </div>
                ) : attemptsError ? (
                  <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {t('takeTest.ownerAttemptsError')}
                  </p>
                ) : attemptSummaries.length === 0 ? (
                  <p className="rounded-2xl bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
                    {t('dashboard.assignments.noAttempts')}
                  </p>
                ) : (
                  <table className="min-w-full text-left text-sm text-slate-200">
                    <thead className="text-xs uppercase tracking-[0.2em] text-indigo-200">
                      <tr>
                        <th className="pb-3 pr-6 font-semibold">
                          {t('dashboard.assignments.columns.participant')}
                        </th>
                        <th className="pb-3 pr-6 font-semibold">
                          {t('dashboard.assignments.columns.score')}
                        </th>
                        <th className="pb-3 pr-6 font-semibold">
                          {t('dashboard.assignments.columns.status')}
                        </th>
                        <th className="pb-3 pr-6 font-semibold">
                          {t('dashboard.assignments.columns.started')}
                        </th>
                        <th className="pb-3 pr-6 font-semibold">
                          {t('dashboard.assignments.columns.completed')}
                        </th>
                        <th className="pb-3 font-semibold">{t('dashboard.assignments.columns.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {attemptSummaries.map((attempt) => {
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
                            <td className="py-3 pr-6 text-white">
                              {formatScore(attempt.score, attempt.max_score, attempt.pending_score)}
                            </td>
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
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300 hover:bg-indigo-500/10"
            >
              {t('common.actions.backToDashboard')}
            </button>
            <button
              type="button"
              onClick={() => {
                router.push(assignment.share_url);
              }}
              className="rounded-2xl border border-indigo-300/40 bg-indigo-500/20 px-6 py-3 text-sm font-semibold text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/40"
            >
              {t('common.actions.openStudentView')}
            </button>
          </div>
        </div>
      </div>

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
                          {t('dashboard.assignments.columns.score')}: {formatScore(attempt.score, attempt.max_score, attempt.pending_score)}
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
    </section>
  );
}
