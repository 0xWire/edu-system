'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { AttemptView, QuestionView, AnswerPayload, StartAttemptRequest } from '@/types/testAttempt';
import { TestAttemptService } from '@/services/testAttempt';
import QuestionDisplay from './QuestionDisplay';
import TestTimer from './TestTimer';
import { useI18n } from '@/contexts/LanguageContext';

interface TestAttemptPageProps {
  assignmentId: string;
  guestName?: string;
  participantFields?: Record<string, string>;
}

export default function TestAttemptPage({ assignmentId, guestName, participantFields }: TestAttemptPageProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionView | null>(null);
  const [completed, setCompleted] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [questionInitialTime, setQuestionInitialTime] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState(false);
  const questionDeadlineRef = useRef<number | null>(null);
  const questionTimeoutTriggeredRef = useRef(false);

  const attemptSubtitle = useMemo(() => {
    if (!attempt) return '';
    if (attempt.status === 'submitted') {
      return t('attempt.subtitleSubmitted');
    }
    if (attempt.status === 'cancelled') {
      return t('attempt.subtitleCancelled');
    }
    if (attempt.status === 'expired') {
      return t('attempt.subtitleExpired');
    }
    return t('attempt.subtitleActive');
  }, [attempt, t]);

  const formatSeconds = useCallback((totalSeconds: number) => {
    const clamped = Math.max(totalSeconds, 0);
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const canFinish = useMemo(() => {
    if (!attempt || attempt.status !== 'active') return false;
    if (attempt.policy?.require_all_answered && attempt.cursor < attempt.total) {
      return false;
    }
    return true;
  }, [attempt]);

  const showTestTimer = useMemo(() => {
    if (!attempt) return false;
    if (attempt.time_left_sec <= 0) return false;
    if ((attempt.policy?.max_attempt_time_sec ?? 0) > 0) return true;
    return !!attempt.policy?.show_elapsed_time;
  }, [attempt]);

  const elapsedSeconds = useMemo(() => {
    if (!attempt) return null;
    if (!attempt.policy?.show_elapsed_time) return null;
    if ((attempt.policy?.max_attempt_time_sec ?? 0) > 0 && attempt.time_left_sec >= 0) {
      return Math.max((attempt.policy?.max_attempt_time_sec ?? 0) - attempt.time_left_sec, 0);
    }
    return null;
  }, [attempt]);

  const canShowScore =
    !!attempt &&
    attempt.status === 'submitted' &&
    attempt.policy?.reveal_score_mode !== 'never' &&
    attempt.score !== undefined &&
    attempt.max_score !== undefined;

  const showLiveScore =
    !!attempt &&
    attempt.policy?.reveal_score_mode === 'always' &&
    attempt.score !== undefined &&
    attempt.max_score !== undefined &&
    attempt.status === 'active';

  const currentQuestionNumber = useMemo(() => {
    if (!attempt) return 1;
    return Math.min(attempt.cursor + 1, Math.max(attempt.total || 1, 1));
  }, [attempt]);

  const resetQuestionTimer = useCallback(() => {
    questionDeadlineRef.current = null;
    questionTimeoutTriggeredRef.current = false;
    setQuestionInitialTime(null);
    setQuestionTimeLeft(null);
  }, []);

  const startQuestionTimer = useCallback(
    (policy?: AttemptView['policy']) => {
      if (!policy || policy.question_time_limit_sec <= 0) {
        resetQuestionTimer();
        return;
      }
      const totalSeconds = policy.question_time_limit_sec;
      const deadline = Date.now() + totalSeconds * 1000;
      questionDeadlineRef.current = deadline;
      questionTimeoutTriggeredRef.current = false;
      setQuestionInitialTime(totalSeconds);
      setQuestionTimeLeft(totalSeconds);
    },
    [resetQuestionTimer]
  );

  const handleQuestionTimeout = useCallback(async () => {
    if (!attempt || questionTimeoutTriggeredRef.current) {
      return;
    }
    questionTimeoutTriggeredRef.current = true;
    setErrorKey('attempt.questionTimeout');
    setLoading(true);
    try {
      const response = await TestAttemptService.getNextQuestion(attempt.attempt_id);
      if (response?.attempt) {
        setAttempt(response.attempt);
        if (response.question) {
          setCurrentQuestion(response.question);
          startQuestionTimer(response.attempt?.policy);
        } else {
          setCurrentQuestion(null);
          resetQuestionTimer();
        }
      } else {
        resetQuestionTimer();
      }
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 410) {
        setAttempt((prev) =>
          prev
            ? {
                ...prev,
                status: 'expired',
                time_left_sec: 0
              }
            : prev
        );
        setCompleted(true);
      }
    } finally {
      setLoading(false);
    }
  }, [attempt, resetQuestionTimer, startQuestionTimer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = 'edu-system-attempt-fingerprint';
    let stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      stored =
        (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(storageKey, stored);
    }
    document.cookie = `attempt_fingerprint=${stored}; path=/; max-age=31536000`;
    setFingerprint(stored);
  }, []);

  useEffect(() => {
    if (questionInitialTime === null || questionDeadlineRef.current === null) {
      return;
    }
    const tick = () => {
      if (questionDeadlineRef.current === null) {
        setQuestionTimeLeft(null);
        return;
      }
      const remaining = Math.max(Math.floor((questionDeadlineRef.current - Date.now()) / 1000), 0);
      setQuestionTimeLeft(remaining);
      if (remaining <= 0) {
        void handleQuestionTimeout();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [questionInitialTime, handleQuestionTimeout]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'active') {
      resetQuestionTimer();
    }
  }, [attempt?.status, resetQuestionTimer]);

  const handleSubmitTest = useCallback(async (currentAttempt?: AttemptView) => {
    const attemptToSubmit = currentAttempt ?? attempt;
    if (!attemptToSubmit) return;

    try {
      setLoading(true);
      const finalAttempt = await TestAttemptService.submitAttempt(attemptToSubmit.attempt_id, {
        version: attemptToSubmit.version
      });
      setAttempt(finalAttempt);
      setCompleted(true);
      setErrorKey(null);
      resetQuestionTimer();
    } catch (err) {
      console.error(err);
      setErrorKey('attempt.submitError');
    } finally {
      setLoading(false);
    }
  }, [attempt, resetQuestionTimer]);

  const handleSubmitAnswer = async (answerPayload: AnswerPayload) => {
    if (!attempt || loading) return;

    try {
      setLoading(true);
      const { attempt: updatedAttempt } = await TestAttemptService.submitAnswer(attempt.attempt_id, {
        version: attempt.version,
        payload: answerPayload
      });
      setAttempt(updatedAttempt);
      setErrorKey(null);

      if (updatedAttempt.cursor < updatedAttempt.total) {
        const response = await TestAttemptService.getNextQuestion(updatedAttempt.attempt_id);
        if (response.attempt) {
          setAttempt(response.attempt);
        }
        if (response.question) {
          setCurrentQuestion(response.question);
          startQuestionTimer(response.attempt?.policy ?? updatedAttempt.policy);
        } else if (response.attempt) {
          setCurrentQuestion(null);
          resetQuestionTimer();
          if (response.attempt.cursor >= response.attempt.total) {
            await handleSubmitTest(response.attempt);
          }
        }
      } else {
        resetQuestionTimer();
        await handleSubmitTest(updatedAttempt);
      }
    } catch (err) {
      console.error(err);
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 410) {
        setErrorKey('attempt.questionTimeout');
        setCompleted(true);
      } else if (axiosErr.response?.status === 409) {
        setErrorKey('attempt.versionMismatch');
      } else {
        setErrorKey('attempt.answerError');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTest = async () => {
    if (!attempt) return;

    try {
      setLoading(true);
      await TestAttemptService.cancelAttempt(attempt.attempt_id, {
        version: attempt.version
      });
      resetQuestionTimer();
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorKey('attempt.cancelError');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeout = () => {
    if (attempt && !completed) {
      resetQuestionTimer();
      void handleSubmitTest();
    }
  };

  useEffect(() => {
    if (!attempt?.policy?.disable_copy) {
      setCopyNotice(false);
      return;
    }
    setCopyNotice(true);

    const prevent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const blockContext = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('dragstart', prevent);

    return () => {
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('dragstart', prevent);
      setCopyNotice(false);
    };
  }, [attempt?.policy?.disable_copy]);

  useEffect(() => {
    if (!attempt?.policy?.disable_browser_back) {
      return;
    }
    const pushState = () => window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      pushState();
      setErrorKey((prev) => prev ?? 'attempt.backBlocked');
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    pushState();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [attempt?.policy?.disable_browser_back]);

  useEffect(() => {
    if (!assignmentId || !fingerprint) {
      return;
    }
    let isMounted = true;

    const startTestAttempt = async () => {
      try {
        setLoading(true);
        const startData: StartAttemptRequest = {
          assignment_id: assignmentId,
          fingerprint,
          fields: participantFields
        };
        if (guestName) {
          startData.guest_name = guestName;
        }

        const attemptData = await TestAttemptService.startAttempt(startData);
        if (!isMounted) return;
        setAttempt(attemptData);
        setErrorKey(null);

        const response = await TestAttemptService.getNextQuestion(attemptData.attempt_id);
        if (!isMounted) return;

        if (response.attempt) {
          setAttempt(response.attempt);
        }
        if (response.question) {
          setCurrentQuestion(response.question);
          startQuestionTimer(response.attempt?.policy ?? attemptData.policy);
        } else if (response.attempt) {
          setCurrentQuestion(null);
          resetQuestionTimer();
          if (response.attempt.cursor >= response.attempt.total) {
            setCompleted(true);
          }
        }
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 429) {
          setErrorKey('attempt.maxAttempts');
        } else if (axiosErr.response?.status === 403) {
          setErrorKey('attempt.forbidden');
        } else if (axiosErr.response?.status === 410) {
          setErrorKey('attempt.questionTimeout');
        } else if (axiosErr.response?.status === 404) {
          setErrorKey('attempt.notFound');
        } else {
          setErrorKey('attempt.errorDescription');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void startTestAttempt();

    return () => {
      isMounted = false;
    };
  }, [
    assignmentId,
    fingerprint,
    guestName,
    participantFields,
    resetQuestionTimer,
    startQuestionTimer
  ]);

  if (loading && !attempt && !errorKey) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/10 px-10 py-12 text-center shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-lg font-medium">{t('attempt.loader')}</p>
          </div>
        </div>
      </section>
    );
  }

  if (errorKey && !attempt) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-red-300">{t('attempt.tag')}</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">{t('attempt.errorTitle')}</h1>
            <p className="mt-3 text-sm text-slate-200">{t(errorKey)}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                {t('common.actions.backToDashboard')}
              </button>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
              >
                {t('attempt.buttons.tryAgain')}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (completed && attempt) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-emerald-300">{t('attempt.completedTag')}</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">{t('attempt.completedTitle')}</h1>
            <p className="mt-3 text-sm text-slate-200">{t('attempt.completedDescription')}</p>

            {canShowScore ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{t('attempt.resultLabel')}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {attempt.score ?? '-'} / {attempt.max_score ?? '-'}
                </p>
              </div>
            ) : (
              attempt.policy?.reveal_score_mode === 'never' && (
                <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {t('attempt.scoreHidden')}
                </p>
              )
            )}

            {attempt.policy?.reveal_solutions ? (
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-emerald-200">
                {t('attempt.solutionsAvailable')}
              </p>
            ) : (
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-300">
                {t('attempt.solutionsHidden')}
              </p>
            )}

          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">{t('attempt.tag')}</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {t('attempt.questionProgress', {
                  current: currentQuestionNumber,
                  total: attempt?.total ?? '—'
                })}
              </h1>
              {guestName && (
                <p className="mt-2 text-sm text-slate-200">{t('attempt.guestLabel', { name: guestName })}</p>
              )}
              {attemptSubtitle && <p className="mt-2 text-xs text-slate-400">{attemptSubtitle}</p>}
            </div>

            {showLiveScore && attempt && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{t('attempt.liveScore')}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {attempt.score ?? '-'} / {attempt.max_score ?? '-'}
                </p>
              </div>
            )}
          </div>

          {attempt && showTestTimer && (
            <div className="flex flex-col items-end gap-2">
              <TestTimer timeLeftInSeconds={attempt.time_left_sec} onTimeout={handleTimeout} />
              {elapsedSeconds !== null && (
                <p className="text-xs text-slate-300">
                  {t('attempt.elapsed', { time: formatSeconds(elapsedSeconds) })}
                </p>
              )}
            </div>
          )}
        </header>

        {copyNotice && attempt?.policy?.disable_copy && (
          <div className="mb-4 rounded-2xl border border-yellow-400/50 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100">
            {t('attempt.copyWarning')}
          </div>
        )}

        {errorKey && (
          <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-500/20 px-5 py-4 text-sm text-red-100">
            {t(errorKey)}
          </div>
        )}

        {currentQuestion ? (
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionNumber}
            totalQuestions={attempt?.total ?? 0}
            onSubmit={handleSubmitAnswer}
            isLoading={loading}
            disabled={attempt?.status !== 'active'}
            questionTimeLeft={questionTimeLeft ?? undefined}
            questionTimeTotal={questionInitialTime ?? undefined}
          />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-200">
            {t('attempt.nextQuestion')}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void handleSubmitTest();
            }}
            disabled={loading || !canFinish}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${
              loading || !canFinish
                ? 'cursor-not-allowed bg-slate-600/40 text-slate-300 shadow-none'
                : 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
            }`}
          >
            {t('attempt.buttons.finish')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCancelTest();
            }}
            disabled={loading}
            className={`rounded-2xl border border-red-400/60 px-6 py-3 text-sm font-semibold transition ${
              loading ? 'cursor-not-allowed bg-red-500/10 text-red-200/60' : 'bg-red-500/20 text-red-100 hover:bg-red-500/30'
            }`}
          >
            {t('attempt.buttons.cancel')}
          </button>
        </div>

        {attempt?.policy?.require_all_answered && attempt?.cursor < (attempt?.total ?? 0) && (
          <p className="mt-3 text-xs text-slate-400">{t('attempt.finishDisabled')}</p>
        )}
      </div>
    </section>
  );
}
