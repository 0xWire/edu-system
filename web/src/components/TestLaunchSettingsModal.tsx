'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import type { GetTestResponse, ScoreRevealMode, AttemptPolicyConfig } from '@/types/test';

export interface LaunchSettingsFormValues {
  durationMinutes: number;
  allowGuests: boolean;
  maxQuestions: number;
  maxAttempts: number;
  questionTimeLimitSec: number;
  maxAttemptTimeMinutes: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  requireAllAnswered: boolean;
  lockAnswerOnConfirm: boolean;
  disableCopy: boolean;
  disableBrowserBack: boolean;
  showElapsedTime: boolean;
  allowNavigation: boolean;
  revealScoreMode: ScoreRevealMode;
  revealSolutions: boolean;
}

interface TestLaunchSettingsModalProps {
  open: boolean;
  test: GetTestResponse | null;
  submitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: LaunchSettingsFormValues) => void;
}

function deriveFormValues(test: GetTestResponse | null): LaunchSettingsFormValues {
  const policy: AttemptPolicyConfig | null = test?.attempt_policy ?? null;
  const defaultAllowGuests = test ? test.allow_guests !== false : true;
  return {
    durationMinutes: test ? Math.max(Math.round(test.duration_sec / 60) || 0, 0) : 0,
    allowGuests: defaultAllowGuests,
    maxQuestions: policy?.max_questions ?? 0,
    maxAttempts: policy?.max_attempts ?? 0,
    questionTimeLimitSec: policy?.question_time_limit_sec ?? 0,
    maxAttemptTimeMinutes: policy ? Math.max(Math.round((policy.max_attempt_time_sec || 0) / 60), 0) : 0,
    shuffleQuestions: policy?.shuffle_questions ?? true,
    shuffleAnswers: policy?.shuffle_answers ?? true,
    requireAllAnswered: policy?.require_all_answered ?? false,
    lockAnswerOnConfirm: policy?.lock_answer_on_confirm ?? false,
    disableCopy: policy?.disable_copy ?? false,
    disableBrowserBack: policy?.disable_browser_back ?? false,
    showElapsedTime: policy?.show_elapsed_time ?? false,
    allowNavigation: policy?.allow_navigation ?? true,
    revealScoreMode: policy?.reveal_score_mode ?? 'after_submit',
    revealSolutions: policy?.reveal_solutions ?? false
  };
}

export default function TestLaunchSettingsModal({
  open,
  test,
  submitting,
  errorMessage,
  onClose,
  onSubmit
}: TestLaunchSettingsModalProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<LaunchSettingsFormValues>(() => deriveFormValues(test));

  useEffect(() => {
    if (open) {
      setForm(deriveFormValues(test));
    }
  }, [open, test?.test_id]);

  const scoreOptions = useMemo(
    () => [
      { value: 'never' as ScoreRevealMode, label: t('dashboard.launch.scoreModes.never') },
      { value: 'after_submit' as ScoreRevealMode, label: t('dashboard.launch.scoreModes.after_submit') },
      { value: 'always' as ScoreRevealMode, label: t('dashboard.launch.scoreModes.always') }
    ],
    [t]
  );

  if (!open || !test) {
    return null;
  }

  const handleNumberChange = (field: keyof LaunchSettingsFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setForm((prev) => ({
      ...prev,
      [field]: Number.isNaN(value) ? 0 : Math.max(value, 0)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/95 p-8 text-slate-100 shadow-[0_50px_150px_-60px_rgba(15,23,42,0.9)]">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('dashboard.launch.tag')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.launch.title', { name: test.title })}</h2>
          <p className="mt-2 text-sm text-slate-300">{t('dashboard.launch.subtitle')}</p>
        </header>

        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">
              {t('dashboard.launch.sections.general')}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span>{t('dashboard.launch.fields.duration')}</span>
                <input
                  type="number"
                  min={0}
                  value={form.durationMinutes}
                  onChange={handleNumberChange('durationMinutes')}
                  className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span>{t('dashboard.launch.fields.maxAttempts')}</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxAttempts}
                  onChange={handleNumberChange('maxAttempts')}
                  className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span>{t('dashboard.launch.fields.maxQuestions')}</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxQuestions}
                  onChange={handleNumberChange('maxQuestions')}
                  className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span>{t('dashboard.launch.fields.questionTime')}</span>
                <input
                  type="number"
                  min={0}
                  value={form.questionTimeLimitSec}
                  onChange={handleNumberChange('questionTimeLimitSec')}
                  className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                <span>{t('dashboard.launch.fields.attemptTime')}</span>
                <input
                  type="number"
                  min={0}
                  value={form.maxAttemptTimeMinutes}
                  onChange={handleNumberChange('maxAttemptTimeMinutes')}
                  className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
                <span>{t('dashboard.launch.fields.allowGuests')}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border border-slate-600 text-indigo-500 focus:ring-indigo-500"
                  checked={form.allowGuests}
                  onChange={(event) => setForm((prev) => ({ ...prev, allowGuests: event.target.checked }))}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">
              {t('dashboard.launch.sections.policy')}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {([
                ['shuffleQuestions', t('dashboard.launch.fields.shuffleQuestions')],
                ['shuffleAnswers', t('dashboard.launch.fields.shuffleAnswers')],
                ['requireAllAnswered', t('dashboard.launch.fields.requireAll')],
                ['lockAnswerOnConfirm', t('dashboard.launch.fields.lockOnConfirm')],
                ['disableCopy', t('dashboard.launch.fields.disableCopy')],
                ['disableBrowserBack', t('dashboard.launch.fields.disableBack')],
                ['showElapsedTime', t('dashboard.launch.fields.showElapsed')],
                ['allowNavigation', t('dashboard.launch.fields.allowNavigation')],
                ['revealSolutions', t('dashboard.launch.fields.revealSolutions')]
              ] as Array<[keyof LaunchSettingsFormValues, string]>).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border border-slate-600 text-indigo-500 focus:ring-indigo-500"
                    checked={form[key] as boolean}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: event.target.checked
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-sm text-slate-200">{t('dashboard.launch.fields.revealScoreMode')}</label>
              <select
                value={form.revealScoreMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    revealScoreMode: event.target.value as ScoreRevealMode
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              >
                {scoreOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <footer className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/10"
            disabled={submitting}
          >
            {t('dashboard.launch.actions.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={submitting}
            className="rounded-2xl bg-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-500/60 disabled:shadow-none"
          >
            {submitting ? t('dashboard.launch.actions.processing') : t('dashboard.launch.actions.start')}
          </button>
        </footer>
      </div>
    </div>
  );
}
