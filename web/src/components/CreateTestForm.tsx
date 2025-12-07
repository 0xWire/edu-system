'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TestService } from '@/services/test';
import { CreateTestRequest, QuestionFormData, AnswerFormData } from '@/types/test';

interface CreateTestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialFormData?: {
    title: string;
    description: string;
    questions: QuestionFormData[];
  };
  initialAuthor?: string;
  mode?: 'create' | 'edit';
  testId?: string;
}

const createEmptyOption = (): AnswerFormData => ({
  answer_text: '',
  image_url: '',
  image_preview: ''
});

const createEmptyQuestion = (): QuestionFormData => ({
  question_text: '',
  options: [createEmptyOption(), createEmptyOption()],
  correct_option: 0,
  correct_options: [],
  type: 'single',
  weight: 1,
  image_url: '',
  image_preview: ''
});

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CreateTestForm({
  onSuccess,
  onCancel,
  initialFormData,
  initialAuthor,
  mode = 'create',
  testId
}: CreateTestFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = mode === 'edit';

  const ensureOptionArray = (options?: AnswerFormData[]) => {
    const normalized = options && options.length > 0 ? options : [createEmptyOption(), createEmptyOption()];
    return normalized;
  };

  const buildInitialState = () => {
    if (!initialFormData) {
      return {
        title: '',
        description: '',
        questions: [createEmptyQuestion()]
      };
    }
    return {
      title: initialFormData.title,
      description: initialFormData.description,
      questions: initialFormData.questions.map((question) => {
        const normalizedType = question.type ?? 'single';
        return {
          ...question,
          type: normalizedType,
          options: ensureOptionArray(question.options).map((opt) => ({
            ...opt,
            image_preview: opt.image_preview ?? opt.image_url ?? ''
          })),
          image_preview: question.image_preview ?? question.image_url ?? ''
        };
      })
    };
  };

  const [formData, setFormData] = useState(buildInitialState);

  useEffect(() => {
    if (initialFormData) {
      setFormData(buildInitialState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialFormData)]);

  const resetState = () => {
    setFormData(buildInitialState());
  };

  const authorDisplay = (() => {
    if (initialAuthor && initialAuthor.trim().length > 0) {
      return initialAuthor;
    }
    const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }
    return user?.email ?? '';
  })();

  const headerTag = isEditMode ? 'Edit test' : 'Create test';
  const headerTitle = isEditMode ? 'Update your assessment' : 'Design a new assessment';
  const headerSubtitle = isEditMode
    ? 'Review every question, adjust the correct answers and keep existing assignments unchanged.'
    : 'Add questions, upload supporting images and configure answer options. All media is stored inline with the test for quick sharing.';
  const submitLabel = isEditMode ? 'Save changes' : 'Create test';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !isEditMode) {
      setError('You must be logged in to create a test');
      return;
    }
    if (isEditMode && !testId) {
      setError('Test identifier is missing');
      return;
    }

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!formData.questions.some((q) => q.question_text.trim())) {
      setError('At least one question is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        const result = await TestService.updateTest(testId!, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          questions: formData.questions.map((q) => ({
            question_text: q.question_text.trim(),
            correct_option: q.correct_option,
            correct_options: q.correct_options && q.correct_options.length ? q.correct_options : undefined,
            type: q.type,
            weight: q.weight,
            image_url: q.image_url || undefined,
            options: q.options.map((opt, optIndex) => ({
              answer_text: opt.answer_text.trim(),
              image_url: opt.image_url || undefined,
              answer: optIndex
            }))
          }))
        });
        if (result.success) {
          onSuccess?.();
        } else {
          setError(result.message || 'Failed to update test');
        }
      } else {
        const testData: CreateTestRequest = {
          author: `${user!.first_name} ${user!.last_name}`.trim() || user!.email,
          title: formData.title.trim(),
          description: formData.description.trim(),
          questions: formData.questions.map((q) => ({
            id: '',
            question_text: q.question_text.trim(),
            options: q.options.map((opt, optIndex) => ({
              answer: optIndex,
              answer_text: opt.answer_text.trim(),
              image_url: opt.image_url || undefined
            })),
            correct_option: q.correct_option,
            correct_options: q.correct_options && q.correct_options.length ? q.correct_options : undefined,
            type: q.type,
            weight: q.weight,
            image_url: q.image_url || undefined
          }))
        };

        const response = await TestService.createTest(testData);

        if (response.success) {
          resetState();
          onSuccess?.();
        } else {
          setError(response.error || 'Failed to create test');
        }
      }
    } catch (err) {
      console.error('Failed to create or update test', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQuestion = <K extends keyof QuestionFormData>(
    questionIndex: number,
    field: K,
    value: QuestionFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex ? { ...q, [field]: value } : q
      )
    }));
  };

  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()]
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData((prev) => {
      if (prev.questions.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      };
    });
  };

  const addOption = (questionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...ensureOptionArray(q.options), createEmptyOption()] }
          : q
      )
    }));
  };

  const updateOption = <K extends keyof AnswerFormData>(
    questionIndex: number,
    optionIndex: number,
    field: K,
    value: AnswerFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: ensureOptionArray(q.options).map((opt, oi) =>
                oi === optionIndex ? { ...opt, [field]: value } : opt
              )
            }
          : q
      )
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== questionIndex) {
          return q;
        }
        const options = ensureOptionArray(q.options);
        if (options.length <= 2) {
          return q;
        }
        const nextOptions = options.filter((_, oi) => oi !== optionIndex);
        const correctOption =
          q.correct_option === optionIndex
            ? 0
            : q.correct_option > optionIndex
            ? q.correct_option - 1
            : q.correct_option;
        const nextCorrectOptions =
          q.correct_options && q.correct_options.length
            ? q.correct_options
                .filter((idx) => idx !== optionIndex)
                .map((idx) => (idx > optionIndex ? idx - 1 : idx))
            : [];
        return {
          ...q,
          options: nextOptions,
          correct_option: correctOption,
          correct_options: nextCorrectOptions
        };
      })
    }));
  };

  const handleQuestionImageUpload = async (questionIndex: number, file?: File | null) => {
    if (!file) {
      updateQuestion(questionIndex, 'image_url', '');
      updateQuestion(questionIndex, 'image_preview', '');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      updateQuestion(questionIndex, 'image_url', dataUrl);
      updateQuestion(questionIndex, 'image_preview', dataUrl);
    } catch (err) {
      console.error('Failed to read image', err);
      setError('Could not read the selected image');
    }
  };

  const handleOptionImageUpload = async (questionIndex: number, optionIndex: number, file?: File | null) => {
    if (!file) {
      updateOption(questionIndex, optionIndex, 'image_url', '');
      updateOption(questionIndex, optionIndex, 'image_preview', '');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      updateOption(questionIndex, optionIndex, 'image_url', dataUrl);
      updateOption(questionIndex, optionIndex, 'image_preview', dataUrl);
    } catch (err) {
      console.error('Failed to read image', err);
      setError('Could not read the selected image');
    }
  };

  return (
    <section className="w-full max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-slate-100 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.9)] backdrop-blur">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">{headerTag}</p>
        <h1 className="text-3xl font-semibold text-white">{headerTitle}</h1>
        <p className="max-w-2xl text-sm text-slate-300">{headerSubtitle}</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Title *</span>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Final exam — spring 2024"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Author</span>
            <input
              type="text"
              value={authorDisplay}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Description *</span>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Briefly describe what this test covers and any instructions for participants."
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </label>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Questions</p>
            <p className="text-sm text-slate-300">
              Add at least one question. Options are required for single/multi types.
            </p>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-2xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
          >
            Add question
          </button>
        </div>

        <div className="space-y-6">
          {formData.questions.map((question, questionIndex) => {
            const questionType = question.type ?? 'single';
            const optionList = ensureOptionArray(question.options);

            return (
              <article
                key={`question-${questionIndex}`}
                className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.8)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                      Question {questionIndex + 1}
                    </p>
                    <p className="text-sm text-slate-300">
                      Provide the prompt and mark the correct option.
                    </p>
                  </div>
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(questionIndex)}
                      className="self-start rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Question text *</span>
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                    placeholder="Type your question"
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </label>

                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Question image</span>
                  {question.image_preview ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <img
                        src={question.image_preview}
                        alt={`Question ${questionIndex + 1}`}
                        className="max-h-48 w-full rounded-xl object-contain"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuestionImageUpload(questionIndex, null)}
                          className="rounded-xl border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/10"
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-slate-300 transition hover:border-indigo-300 hover:text-indigo-200">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          void handleQuestionImageUpload(questionIndex, file);
                          event.target.value = '';
                        }}
                      />
                      <span className="text-base font-semibold text-white">Upload image</span>
                      <span className="text-xs text-slate-400">PNG, JPG or WEBP up to 5 MB</span>
                    </label>
                  )}
                </div>

                {(questionType === 'single' || questionType === 'multi') && (
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Answer options</span>
                      <button
                        type="button"
                        onClick={() => addOption(questionIndex)}
                        className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200 transition hover:border-indigo-300 hover:text-white"
                      >
                        Add option
                      </button>
                    </div>

                    <div className="space-y-4">
                      {optionList.map((option, optionIndex) => (
                        <div
                          key={`question-${questionIndex}-option-${optionIndex}`}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:gap-4"
                        >
                          <div className="flex items-start gap-3">
                            {questionType === 'multi' ? (
                              <input
                                type="checkbox"
                                checked={question.correct_options?.includes(optionIndex) ?? false}
                                onChange={(e) => {
                                  const existing = question.correct_options ?? [];
                                  const next = e.target.checked
                                    ? Array.from(new Set([...existing, optionIndex]))
                                    : existing.filter((idx) => idx !== optionIndex);
                                  updateQuestion(questionIndex, 'correct_options', next);
                                  if (next.length === 1) {
                                    updateQuestion(questionIndex, 'correct_option', next[0]);
                                  }
                                }}
                                className="mt-1 h-4 w-4 border-slate-400 text-indigo-500 focus:ring-indigo-500"
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`correct-${questionIndex}`}
                                checked={question.correct_option === optionIndex}
                                onChange={() => updateQuestion(questionIndex, 'correct_option', optionIndex)}
                                className="mt-1 h-4 w-4 border-slate-400 text-indigo-500 focus:ring-indigo-500"
                              />
                            )}
                            <div className="flex-1 space-y-3">
                              <label className="flex flex-col gap-2">
                                <span className="text-xs uppercase tracking-[0.3em] text-indigo-200">Option text *</span>
                                <input
                                  type="text"
                                  value={option.answer_text}
                                  onChange={(e) => updateOption(questionIndex, optionIndex, 'answer_text', e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                              </label>

                              <div className="space-y-2">
                                {option.image_preview ? (
                                  <div className="flex flex-col gap-3">
                                    <img
                                      src={option.image_preview}
                                      alt={`Option ${optionIndex + 1}`}
                                      className="max-h-32 w-full rounded-xl object-contain"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleOptionImageUpload(questionIndex, optionIndex, null)}
                                      className="self-start rounded-xl border border-red-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/10"
                                    >
                                      Remove image
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-center text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-200">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        void handleOptionImageUpload(questionIndex, optionIndex, file);
                                        event.target.value = '';
                                      }}
                                    />
                                    <span>Add image</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>

                          {optionList.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              className="self-start rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/10"
                            >
                              Remove option
                            </button>
                          )}
                        </div>
                      ))}

                      <p className="text-xs text-slate-400">
                        {questionType === 'multi'
                          ? 'Select one or more correct options with the checkbox.'
                          : 'Choose the correct answer using the radio button on the left.'}
                      </p>
                    </div>
                  </section>
                )}

                {(questionType === 'text' || questionType === 'code') && (
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">
                      {questionType === 'text' ? 'Open answer' : 'Code answer'}
                    </p>
                    <p className="text-xs text-slate-400">
                      The response will be stored for manual grading. No options required.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-white/15 bg-transparent px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
