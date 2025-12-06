'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { QuestionView, AnswerPayload } from '@/types/testAttempt';
import { useI18n } from '@/contexts/LanguageContext';

interface QuestionDisplayProps {
  question: QuestionView;
  questionNumber: number;
  totalQuestions: number;
  onSubmit: (answer: AnswerPayload) => void;
  isLoading: boolean;
  disabled?: boolean;
  questionTimeLeft?: number | null;
  questionTimeTotal?: number | null;
}

const formatQuestionTimer = (seconds: number) => {
  const clamped = Math.max(seconds, 0);
  const minutes = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return `${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export default function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  onSubmit,
  isLoading,
  disabled = false,
  questionTimeLeft,
  questionTimeTotal
}: QuestionDisplayProps) {
  const { t } = useI18n();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<Record<number, boolean>>({});
  const [textAnswer, setTextAnswer] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');

  const progress = useMemo(() => {
    if (!totalQuestions || totalQuestions <= 0) return 0;
    return Math.min(100, Math.round((questionNumber / totalQuestions) * 100));
  }, [questionNumber, totalQuestions]);

  const showQuestionTimer =
    typeof questionTimeTotal === 'number' &&
    questionTimeTotal > 0 &&
    typeof questionTimeLeft === 'number' &&
    questionTimeLeft >= 0;

  const questionTimerProgress = useMemo(() => {
    if (!showQuestionTimer || !questionTimeTotal) return 0;
    return Math.max(0, Math.min(100, Math.round((questionTimeLeft! / questionTimeTotal) * 100)));
  }, [questionTimeLeft, questionTimeTotal, showQuestionTimer]);

  const isInteractionDisabled = isLoading || disabled;

  const handleSubmit = () => {
    if (isInteractionDisabled) return;
    const kind = question.type || 'single';
    if (kind === 'single') {
      if (selectedOptionIndex === null) return;
      onSubmit({ kind: 'single', selected: selectedOptionIndex });
      setSelectedOptionIndex(null);
      setSelectedMulti({});
    } else if (kind === 'multi') {
      const selected = Object.entries(selectedMulti)
        .filter(([, v]) => v)
        .map(([key]) => Number(key));
      onSubmit({ kind: 'multi', selected_options: selected });
    } else if (kind === 'text') {
      onSubmit({ kind: 'text', text: textAnswer });
    } else if (kind === 'code') {
      onSubmit({ kind: 'code', code: { lang: 'plain', body: codeAnswer } });
    }
  };

  useEffect(() => {
    // reset input state when question changes
    setSelectedOptionIndex(null);
    setSelectedMulti({});
    setTextAnswer('');
    setCodeAnswer('');
  }, [question.id]);

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

        {showQuestionTimer && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
            <p className="font-semibold uppercase tracking-[0.2em]">{t('question.timeLimitLabel')}</p>
            <div className="flex items-center gap-3 text-sm font-semibold text-indigo-600">
              <div className="relative h-2 w-32 overflow-hidden rounded-full bg-indigo-200">
                <div
                  className="absolute inset-y-0 left-0 h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${questionTimerProgress}%` }}
                />
              </div>
              <span>{t('question.timeRemaining', { time: formatQuestionTimer(questionTimeLeft ?? 0) })}</span>
            </div>
          </div>
        )}
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

      {question.type !== 'text' && question.type !== 'code' && (
        <section className="mt-8 space-y-3">
          {question.options.map((option, index) => {
            const isActive =
              question.type === 'multi'
                ? selectedMulti[index] === true
                : selectedOptionIndex === index;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (isInteractionDisabled) return;
                  if (question.type === 'multi') {
                    setSelectedMulti((prev) => ({ ...prev, [index]: !prev[index] }));
                  } else {
                    setSelectedOptionIndex(index);
                  }
                }}
                disabled={isInteractionDisabled}
                className={`group flex w-full items-start gap-3 rounded-2xl border px-5 py-4 text-left transition ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 shadow-[0_16px_40px_-28px_rgba(59,130,246,0.7)]'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60'
                } ${isInteractionDisabled ? 'cursor-not-allowed opacity-70' : ''}`}
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
      )}

      {(question.type === 'text' || question.type === 'code') && (
        <section className="mt-8 space-y-3">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-indigo-500">
              {question.type === 'code' ? t('question.codeLabel') : t('question.textLabel')}
            </span>
            <textarea
              rows={question.type === 'code' ? 8 : 4}
              value={question.type === 'code' ? codeAnswer : textAnswer}
              onChange={(e) => (question.type === 'code' ? setCodeAnswer(e.target.value) : setTextAnswer(e.target.value))}
              disabled={isInteractionDisabled}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-200/50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
              placeholder={
                question.type === 'code'
                  ? t('question.codePlaceholder')
                  : t('question.textPlaceholder')
              }
            />
          </label>
        </section>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{t('question.answerHint')}</p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            isInteractionDisabled ||
            (question.type === 'single' && selectedOptionIndex === null) ||
            (question.type === 'multi' &&
              !Object.values(selectedMulti).some(Boolean)) ||
            (question.type === 'text' && !textAnswer.trim()) ||
            (question.type === 'code' && !codeAnswer.trim())
          }
          className={`rounded-2xl px-6 py-3 text-sm font-semibold transition ${
            isInteractionDisabled ||
            (question.type === 'single' && selectedOptionIndex === null) ||
            (question.type === 'multi' && !Object.values(selectedMulti).some(Boolean)) ||
            (question.type === 'text' && !textAnswer.trim()) ||
            (question.type === 'code' && !codeAnswer.trim())
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600'
          }`}
        >
          {isInteractionDisabled ? t('common.actions.submitting') : t('common.actions.submit')}
        </button>
      </footer>
    </article>
  );
}
