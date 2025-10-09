'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { QuestionView, AnswerPayload } from '@/types/testAttempt';
import { useI18n } from '@/contexts/LanguageContext';

interface QuestionDisplayProps {
  question: QuestionView;
  questionNumber: number;
  totalQuestions: number;
  onSubmit: (answer: AnswerPayload) => void;
  isLoading: boolean;
}

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  onSubmit,
  isLoading
}: QuestionDisplayProps) {
  const { t } = useI18n();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const progress = useMemo(() => {
    if (!totalQuestions || totalQuestions <= 0) return 0;
    return Math.min(100, Math.round((questionNumber / totalQuestions) * 100));
  }, [questionNumber, totalQuestions]);

  const handleSubmit = () => {
    if (selectedOptionIndex === null || isLoading) return;
    onSubmit({
      kind: 'single',
      selected: selectedOptionIndex
    });
    setSelectedOptionIndex(null);
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-white/95 p-8 text-slate-900 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">
              {t('question.tag')} {questionNumber}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{question.question_text}</h2>
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {questionNumber} / {totalQuestions}
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {question.image_url && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <Image
            src={question.image_url}
            alt={t('question.imageAlt')}
            width={960}
            height={540}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      )}

      <section className="mt-8 space-y-3">
        {question.options.map((option, index) => {
          const isActive = selectedOptionIndex === index;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedOptionIndex(index)}
              className={`flex w-full items-start gap-3 rounded-2xl border px-5 py-4 text-left transition ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 shadow-[0_16px_40px_-28px_rgba(59,130,246,0.7)]'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60'
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600 group-hover:bg-indigo-100'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-slate-900">{option.option_text}</p>
                {option.image_url && (
                  <div className="relative h-32 w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <Image
                      src={option.image_url}
                      alt={t('question.optionImageAlt')}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 80vw, 320px"
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </section>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{t('question.answerHint')}</p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || selectedOptionIndex === null}
          className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
            isLoading || selectedOptionIndex === null
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600'
          }`}
        >
          {isLoading ? t('common.actions.submitting') : t('common.actions.submit')}
        </button>
      </footer>
    </article>
  );
}
