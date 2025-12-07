'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TestAttemptPage from '@/components/TestAttempt/TestAttemptPage';
import { useI18n } from '@/contexts/LanguageContext';
import { AssignmentService } from '@/services/assignment';
import type { AssignmentView } from '@/types/assignment';

export default function TakeTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useI18n();

  const assignmentId = searchParams.get('assignmentId');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [participantFields, setParticipantFields] = useState<Record<string, string>>({});
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentView | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setAssignment(null);
      return;
    }

    let isMounted = true;
    const load = async () => {
      try {
        const data = await AssignmentService.getAssignment(assignmentId);
        if (!isMounted) return;
        setAssignment(data);
      } catch (error) {
        console.error('Failed to fetch assignment', error);
        if (isMounted) {
          setAssignment(null);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [assignmentId]);

  const isOwner = assignment?.is_owner ?? false;

  useEffect(() => {
    if (!assignment || !assignment.is_owner) {
      return;
    }
    const target = assignment.manage_url || `/dashboard/assignments/${assignment.assignment_id}`;
    router.replace(target);
  }, [assignment, router]);

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

  const fullName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
    [firstName, lastName]
  );

  const requiresExtra = Boolean(
    assignment?.fields?.some((f) => f.required && !['first_name', 'last_name'].includes(f.key))
  );

  const canStart =
    fullName.length > 0 &&
    (!assignment?.fields ||
      assignment.fields.every((field) => {
        if (field.key === 'first_name') return firstName.trim().length > 0 || !field.required;
        if (field.key === 'last_name') return lastName.trim().length > 0 || !field.required;
        const val = extraFields[field.key]?.trim() ?? '';
        return field.required ? val.length > 0 : true;
      }));

  const handleStart = useCallback(() => {
    if (!canStart) {
      return;
    }
    const normalizedFields: Record<string, string> = {};
    const fieldSpecs =
      assignment?.fields && assignment.fields.length > 0
        ? assignment.fields
        : [
            { key: 'first_name', label: 'First name', required: true },
            { key: 'last_name', label: 'Last name', required: true }
          ];

    fieldSpecs.forEach((field) => {
      let value = '';
      if (field.key === 'first_name') {
        value = firstName.trim();
      } else if (field.key === 'last_name') {
        value = lastName.trim();
      } else {
        value = (extraFields[field.key] ?? '').trim();
      }
      if (value) {
        normalizedFields[field.key] = value;
      }
    });

    setParticipantFields(normalizedFields);
    setGuestName(fullName.trim());
    setHasStarted(true);
  }, [canStart, fullName, assignment, extraFields, firstName, lastName]);

  if (!assignmentId) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">{t('takeTest.missingTag')}</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">{t('takeTest.missingTitle')}</h1>
            <p className="mt-3 text-sm text-slate-200">{t('takeTest.missingDescription')}</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="mt-6 rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
            >
              {t('takeTest.ctaDashboard')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isOwner) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12">
          <div className="flex flex-col items-center space-y-4 rounded-3xl bg-white/5 px-10 py-8 text-center shadow-2xl backdrop-blur">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            <p className="text-sm text-slate-200">{t('common.status.loading')}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasStarted) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">{t('takeTest.setupTag')}</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">{t('takeTest.setupTitle')}</h1>
            <p className="mt-3 text-sm text-slate-200">{t('takeTest.setupDescription')}</p>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('takeTest.detailsTag')}</p>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  {assignment?.title || t('dashboard.assignments.untitled')}
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  {t('takeTest.timeLimitLabel')}: <span className="font-semibold text-white">{timeLimitText}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-indigo-200">
                    {t('takeTest.firstNameLabel')}
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-indigo-200">
                    {t('takeTest.lastNameLabel')}
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>
                <p className="text-xs text-slate-300">{t('takeTest.nameHelp')}</p>
                {assignment?.fields
                  ?.filter((field) => field.key !== 'first_name' && field.key !== 'last_name')
                  .map((field) => (
                    <div key={field.key}>
                      <label htmlFor={`extra-${field.key}`} className="block text-sm font-medium text-indigo-200">
                        {field.label}
                        {field.required ? ' *' : ''}
                      </label>
                      <input
                        id={`extra-${field.key}`}
                        type="text"
                        value={extraFields[field.key] ?? ''}
                        onChange={(e) =>
                          setExtraFields((prev) => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                      />
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${
                  !canStart
                    ? 'cursor-not-allowed bg-slate-600/40 text-slate-300 shadow-none'
                    : 'bg-indigo-500 text-white shadow-indigo-500/30 hover:bg-indigo-600'
                }`}
              >
                {t('common.actions.startTest')}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <TestAttemptPage
      assignmentId={assignmentId}
      guestName={guestName || undefined}
      participantFields={participantFields}
    />
  );
}
