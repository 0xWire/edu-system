'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import CreateTestForm from '@/components/CreateTestForm';
import { TestService } from '@/services/test';
import type { QuestionFormData, GetTestResponse } from '@/types/test';
import { useI18n } from '@/contexts/LanguageContext';

interface PageProps {
  params: {
    testId: string;
  };
}

export default function EditTestPage({ params }: PageProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<GetTestResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await TestService.getTest(params.testId);
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
  }, [params.testId, t]);

  const initialFormData = useMemo(() => {
    if (!test) {
      return undefined;
    }
    const questions: QuestionFormData[] = test.questions.map((question) => ({
      question_text: question.question_text,
      correct_option: question.correct_option,
      image_url: question.image_url ?? '',
      image_preview: question.image_url ?? '',
      options: question.options.map((option) => ({
        answer_text: option.option_text,
        image_url: option.image_url ?? '',
        image_preview: option.image_url ?? ''
      }))
    }));
    return {
      title: test.title,
      description: test.description,
      questions
    };
  }, [test]);

  const handleSuccess = () => {
    router.push(`/dashboard/tests/${params.testId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <span className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            </div>
          ) : error || !test ? (
            <div className="rounded-3xl border border-red-400/40 bg-red-500/10 px-6 py-6 text-sm text-red-100">
              <p>{error ?? t('dashboard.testsDetail.error')}</p>
              <button
                type="button"
                onClick={handleCancel}
                className="mt-4 rounded-2xl border border-red-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-200 transition hover:bg-red-500/10"
              >
                {t('common.actions.backToDashboard')}
              </button>
            </div>
          ) : (
            <CreateTestForm
              mode="edit"
              testId={params.testId}
              initialFormData={initialFormData}
              initialAuthor={test.author}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
