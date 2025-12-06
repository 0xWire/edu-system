'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TestService } from '@/services/test';
import type { GetTestResponse } from '@/types/test';
import { useI18n } from '@/contexts/LanguageContext';
import MathText from './MathText';

interface TestDetailsProps {
  testId: string;
}

export default function TestDetails({ testId }: TestDetailsProps) {
  const router = useRouter();
  const { t, language } = useI18n();
  const [test, setTest] = useState<GetTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await TestService.getTest(testId);
        if (!mounted) return;
        setTest(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load test', err);
        if (mounted) {
          setError(t('dashboard.testsDetail.error'));
          setTest(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [testId, t]);

  const durationText = useMemo(() => {
    if (!test || !test.duration_sec || test.duration_sec <= 0) {
      return t('dashboard.testsDetail.durationNone');
    }
    const totalMinutes = Math.round(test.duration_sec / 60);
    const formatter = new Intl.NumberFormat(language);
    return t('dashboard.testsDetail.durationMinutes', { value: formatter.format(totalMinutes) });
  }, [language, t, test]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="rounded-3xl border border-red-400/40 bg-red-500/10 px-6 py-6 text-sm text-red-100">
        <p>{error ?? t('dashboard.testsDetail.error')}</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard/tests')}
          className="mt-4 rounded-2xl border border-red-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-200 transition hover:bg-red-500/10"
        >
          {t('dashboard.testsDetail.backToTests')}
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{t('dashboard.testsDetail.tag')}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{test.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-200">
          <MathText text={test.description} />
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-indigo-200">
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
            {durationText}
          </span>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2">
            {test.allow_guests ? t('dashboard.testsDetail.guestsAllowed') : t('dashboard.testsDetail.guestsDisabled')}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/tests/${test.test_id}/edit`)}
            className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
          >
            {t('dashboard.testsDetail.editAction')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/tests')}
            className="rounded-2xl border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300 hover:text-white"
          >
            {t('dashboard.testsDetail.backToTests')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-2xl border border-emerald-300/40 bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/30"
          >
            {t('dashboard.testsDetail.launchAction')}
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {test.questions.map((question, index) => (
          <article
            key={question.id}
            className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.8)]"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                  {t('dashboard.testsDetail.questionLabel', { index: index + 1 })}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  <MathText text={question.question_text} />
                </h2>
              </div>
              {question.image_url && (
                <img
                  src={question.image_url}
                  alt={t('dashboard.testsDetail.questionImageAlt', { index: index + 1 })}
                  className="h-24 w-24 rounded-2xl border border-white/10 object-cover"
                />
              )}
            </div>

            <ul className="space-y-2">
              {question.options.map((option, optionIndex) => {
                const isCorrect = optionIndex === question.correct_option;
                return (
                  <li
                    key={option.id}
                    className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
                      isCorrect
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-slate-200'
                    }`}
                  >
                    <div>
                      <MathText text={option.option_text} className="font-medium" />
                      {option.image_url && (
                        <img
                          src={option.image_url}
                          alt={t('dashboard.testsDetail.optionImageAlt', {
                            index: index + 1,
                            option: optionIndex + 1
                          })}
                          className="mt-2 h-20 w-20 rounded-xl border border-white/10 object-cover"
                        />
                      )}
                    </div>
                    {isCorrect && (
                      <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                        {t('dashboard.testsDetail.correctBadge')}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
