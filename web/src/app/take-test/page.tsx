'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TestAttemptPage from '@/components/TestAttempt/TestAttemptPage';
import { useI18n } from '@/contexts/LanguageContext';
import { AssignmentService } from '@/services/assignment';
import type { AssignmentView } from '@/types/assignment';

export default function TakeTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const assignmentId = searchParams.get('assignmentId');

  const [guestName, setGuestName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [assignment, setAssignment] = useState<AssignmentView | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

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
        if (typeof window !== 'undefined') {
          setShareLink(`${window.location.origin}/take-test?assignmentId=${assignmentId}`);
        }
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

  useEffect(() => {
    if (copyState === 'copied') {
      const timeout = window.setTimeout(() => setCopyState('idle'), 2000);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [copyState]);

  const invitationDescription = useMemo(
    () => (isGuest ? t('takeTest.invitationGuest') : t('takeTest.invitationAccount')),
    [isGuest, t]
  );

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

  if (!hasStarted) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)] backdrop-blur">
              <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">{t('takeTest.setupTag')}</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{t('takeTest.setupTitle')}</h1>
              <p className="mt-3 text-sm text-slate-200">{t('takeTest.setupDescription')}</p>

              <div className="mt-8 space-y-5">
                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 transition hover:border-indigo-300">
                  <input
                    type="radio"
                    name="mode"
                    checked={!isGuest}
                    onChange={() => setIsGuest(false)}
                    className="mt-1 h-4 w-4 border-slate-400 text-indigo-500 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-white">{t('takeTest.accountOption')}</p>
                    <p className="mt-1 text-sm text-slate-300">{t('takeTest.accountDescription')}</p>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 transition hover:border-indigo-300">
                  <input
                    type="radio"
                    name="mode"
                    checked={isGuest}
                    onChange={() => setIsGuest(true)}
                    className="mt-1 h-4 w-4 border-slate-400 text-indigo-500 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-white">{t('takeTest.guestOption')}</p>
                    <p className="mt-1 text-sm text-slate-300">{t('takeTest.guestDescription')}</p>
                  </div>
                </label>
              </div>

              <p className="mt-6 text-xs uppercase tracking-[0.3em] text-indigo-300">{t('takeTest.tipTag')}</p>
              <p className="mt-2 text-sm text-slate-200">{invitationDescription}</p>

              {isGuest && (
                <div className="mt-6">
                  <label htmlFor="guest-name" className="block text-sm font-medium text-indigo-200">
                    {t('takeTest.guestLabel')}
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t('common.helpers.exampleName')}
                    className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-300 hover:bg-indigo-500/10"
                >
                  {t('common.actions.backToDashboard')}
                </button>
                <button
                  type="button"
                  onClick={() => setHasStarted(true)}
                  disabled={isGuest && !guestName.trim()}
                  className={`rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition ${
                    isGuest && !guestName.trim()
                      ? 'cursor-not-allowed bg-slate-600/40 text-slate-300 shadow-none'
                      : 'bg-indigo-500 text-white shadow-indigo-500/30 hover:bg-indigo-600'
                  }`}
                >
                  {t('common.actions.startTest')}
                </button>
              </div>
            </div>

            <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.7)] backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{t('takeTest.shareTag')}</p>
                <h2 className="mt-3 text-xl font-semibold text-white">{t('takeTest.shareTitle')}</h2>
                <p className="mt-2 text-sm text-slate-200">{t('takeTest.shareDescription')}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">{t('takeTest.shareLabel')}</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!shareLink) return;
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(shareLink).then(() => setCopyState('copied'));
                      }
                    }}
                    className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
                  >
                    {copyState === 'copied' ? t('common.actions.copied') : t('common.actions.copyLink')}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">{t('takeTest.adviceTitle')}</p>
                <p className="mt-2">{t('takeTest.adviceText')}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  return <TestAttemptPage assignmentId={assignmentId} guestName={isGuest ? guestName : undefined} />;
}
