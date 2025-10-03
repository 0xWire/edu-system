'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AttemptView, QuestionView, AnswerPayload } from '@/types/testAttempt';
import { TestAttemptService } from '@/services/testAttempt';
import QuestionDisplay from './QuestionDisplay';
import TestTimer from './TestTimer';
import { useI18n } from '@/contexts/LanguageContext';

interface TestAttemptPageProps {
  testId: string;
  guestName?: string;
}

export default function TestAttemptPage({ testId, guestName }: TestAttemptPageProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionView | null>(null);
  const [completed, setCompleted] = useState(false);

  const attemptSubtitle = useMemo(() => {
    if (!attempt) return '';
    if (attempt.status === 'submitted') {
      return t('attempt.subtitleSubmitted');
    }
    if (attempt.status === 'cancelled') {
      return t('attempt.subtitleCancelled');
    }
    return t('attempt.subtitleActive');
  }, [attempt, t]);

  useEffect(() => {
    let isMounted = true;

    const startTestAttempt = async () => {
      try {
        setLoading(true);
        const startData: { test_id: string; guest_name?: string } = { test_id: testId };
        if (guestName) {
          startData.guest_name = guestName;
        }

        const attemptData = await TestAttemptService.startAttempt(startData);
        if (!isMounted) return;
        setAttempt(attemptData);

        const { attempt: updatedAttempt, question } = await TestAttemptService.getNextQuestion(attemptData.attempt_id);
        if (!isMounted) return;
        setAttempt(updatedAttempt);
        setCurrentQuestion(question);
        setErrorKey(null);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setErrorKey('attempt.errorDescription');
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
  }, [testId, guestName]);

  const handleSubmitAnswer = async (answerPayload: AnswerPayload) => {
    if (!attempt) return;

    try {
      setLoading(true);
      const { attempt: updatedAttempt } = await TestAttemptService.submitAnswer(attempt.attempt_id, {
        version: attempt.version,
        answer: answerPayload
      });
      setAttempt(updatedAttempt);
      setErrorKey(null);

      if (updatedAttempt.cursor < updatedAttempt.total) {
        const { attempt: latestAttempt, question } = await TestAttemptService.getNextQuestion(updatedAttempt.attempt_id);
        setAttempt(latestAttempt);
        setCurrentQuestion(question);
      } else {
        await handleSubmitTest();
      }
    } catch (err) {
      console.error(err);
      setErrorKey('attempt.answerError');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTest = async () => {
    if (!attempt) return;

    try {
      setLoading(true);
      const finalAttempt = await TestAttemptService.submitAttempt(attempt.attempt_id, {
        version: attempt.version
      });
      setAttempt(finalAttempt);
      setCompleted(true);
      setErrorKey(null);
    } catch (err) {
      console.error(err);
      setErrorKey('attempt.submitError');
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
      void handleSubmitTest();
    }
  };

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

            {(attempt.score !== undefined || attempt.max_score !== undefined) && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{t('attempt.resultLabel')}</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {attempt.score ?? '-'} / {attempt.max_score ?? '-'}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
              >
                {t('common.actions.backToDashboard')}
              </button>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                {t('common.actions.startOver')}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">{t('attempt.tag')}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              {t('attempt.questionProgress', {
                current: attempt ? attempt.cursor + 1 : 1,
                total: attempt?.total ?? '—'
              })}
            </h1>
            {guestName && <p className="mt-2 text-sm text-slate-200">{t('attempt.guestLabel', { name: guestName })}</p>}
            {attemptSubtitle && <p className="mt-2 text-xs text-slate-400">{attemptSubtitle}</p>}
          </div>

          {attempt && attempt.time_left_sec > 0 && (
            <TestTimer timeLeftInSeconds={attempt.time_left_sec} onTimeout={handleTimeout} />
          )}
        </header>

        {errorKey && (
          <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-500/20 px-5 py-4 text-sm text-red-100">
            {t(errorKey)}
          </div>
        )}

        {currentQuestion ? (
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={(attempt?.cursor ?? 0) + 1}
            totalQuestions={attempt?.total ?? 0}
            onSubmit={handleSubmitAnswer}
            isLoading={loading}
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
            disabled={loading}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${
              loading ? 'cursor-not-allowed bg-slate-600/40 text-slate-300 shadow-none' : 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
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
      </div>
    </section>
  );
}
