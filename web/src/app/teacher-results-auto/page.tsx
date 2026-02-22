'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AUTO_TEACHER_RESULTS_STORAGE_KEY,
  type AutoTeacherResult,
} from '@/components/automation/mockTestAttemptService';

type ScoreMap = Record<string, number>;

const fallbackResult: AutoTeacherResult = {
  attempt_id: 'mock-attempt-fallback',
  assignment_id: 'math-demo-2026-auto',
  student_name: 'Roman Voronov',
  submitted_at: new Date().toISOString(),
  objective_score: 6,
  objective_max: 8,
  open_score: 16,
  open_max: 20,
  total_score: 22,
  total_max: 28,
  open_checks: [
    {
      question_id: 'mq-3',
      question_text: 'Explain why every real symmetric matrix has an orthonormal eigenbasis.',
      student_answer: 'By the spectral theorem, symmetric matrices have real eigenvalues and orthogonal eigenspaces.',
      ai_score: 4,
      max_score: 4,
      ai_notes: ['Mentions spectral theorem.', 'Uses orthogonality argument.'],
    },
    {
      question_id: 'mq-4',
      question_text: 'Describe how a basis change matrix transforms coordinates between two bases.',
      student_answer: 'A basis-change matrix maps coordinate vectors from one basis representation to another.',
      ai_score: 3,
      max_score: 4,
      ai_notes: ['Mentions basis and coordinate mapping.', 'Could add inverse relation detail.'],
    },
    {
      question_id: 'mq-5',
      question_text: 'State the chain rule and give one practical derivative example.',
      student_answer: 'Chain rule: derivative of f(g(x)) equals f\'(g(x)) times g\'(x).',
      ai_score: 3,
      max_score: 4,
      ai_notes: ['States core formula.', 'Example detail can be expanded.'],
    },
    {
      question_id: 'mq-6',
      question_text: 'Interpret the geometric meaning of a definite integral on interval [a,b].',
      student_answer: 'Definite integral corresponds to area under the curve on an interval.',
      ai_score: 3,
      max_score: 4,
      ai_notes: ['Correct area interpretation.', 'Could mention signed area explicitly.'],
    },
    {
      question_id: 'mq-7',
      question_text: 'Give one short real-world application of eigenvalues in engineering or data science.',
      student_answer: 'PCA uses eigenvectors and eigenvalues to reduce dimensions in data.',
      ai_score: 3,
      max_score: 4,
      ai_notes: ['Provides valid data science application.', 'Could add more context.'],
    },
  ],
};

export default function TeacherResultsAutoPage() {
  const [result, setResult] = useState<AutoTeacherResult>(fallbackResult);
  const [manualScores, setManualScores] = useState<ScoreMap>({});
  const [saveNotice, setSaveNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(AUTO_TEACHER_RESULTS_STORAGE_KEY);
    if (!raw) {
      setResult(fallbackResult);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AutoTeacherResult;
      if (!parsed.attempt_id || !Array.isArray(parsed.open_checks)) {
        setResult(fallbackResult);
        return;
      }
      setResult(parsed);
    } catch {
      setResult(fallbackResult);
    }
  }, []);

  useEffect(() => {
    const next: ScoreMap = {};
    result.open_checks.forEach((check) => {
      next[check.question_id] = check.ai_score;
    });
    setManualScores(next);
  }, [result]);

  useEffect(() => {
    if (!saveNotice) {
      return;
    }
    const timer = window.setTimeout(() => setSaveNotice(false), 1400);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  const manualOpenTotal = useMemo(() => {
    return result.open_checks.reduce((sum, check) => {
      const value = manualScores[check.question_id] ?? check.ai_score;
      return sum + value;
    }, 0);
  }, [manualScores, result.open_checks]);

  const aiOpenTotal = useMemo(() => {
    return result.open_checks.reduce((sum, check) => sum + check.ai_score, 0);
  }, [result.open_checks]);

  const manualOverall = result.objective_score + manualOpenTotal;

  const applyAIScores = () => {
    const next: ScoreMap = {};
    result.open_checks.forEach((check) => {
      next[check.question_id] = check.ai_score;
    });
    setManualScores(next);
  };

  const commitManualScores = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const updated: AutoTeacherResult = {
      ...result,
      open_score: manualOpenTotal,
      total_score: manualOverall,
      open_checks: result.open_checks.map((check) => ({
        ...check,
        ai_score: manualScores[check.question_id] ?? check.ai_score,
      })),
    };

    setResult(updated);
    window.localStorage.setItem(AUTO_TEACHER_RESULTS_STORAGE_KEY, JSON.stringify(updated));
    setSaveNotice(true);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-cyan-300">Teacher Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Student Results and AI Review</h1>
              <p className="mt-2 text-sm text-slate-200">
                AI pre-checks open-ended answers and suggests scores. Teacher validates or adjusts before publishing final grade.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ai-studio-auto"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100"
              >
                AI Studio
              </Link>
              <Link
                href="/take-test-auto"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100"
              >
                Student Window
              </Link>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-2">
            <article className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Attempt Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <SummaryRow label="Student" value={result.student_name} />
                <SummaryRow label="Attempt" value={result.attempt_id} />
                <SummaryRow label="Submitted" value={new Date(result.submitted_at).toLocaleString()} />
                <SummaryRow label="Objective" value={`${result.objective_score} / ${result.objective_max}`} />
                <SummaryRow label="AI Open Review" value={`${aiOpenTotal} / ${result.open_max}`} />
                <SummaryRow label="Manual Open Review" value={`${manualOpenTotal} / ${result.open_max}`} />
                <SummaryRow label="Overall" value={`${manualOverall} / ${result.total_max}`} highlight />
              </div>
            </article>

            <article className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Role of AI in grading</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-cyan-100">
                <li>AI pre-checks each open question and proposes score using rubric keywords.</li>
                <li>AI explains rationale so teacher can quickly verify quality.</li>
                <li>Teacher keeps final decision and can override any AI suggestion.</li>
              </ul>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyAIScores}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Apply AI Scores
                </button>
                <button
                  type="button"
                  onClick={commitManualScores}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100"
                >
                  Save Final Scores
                </button>
              </div>
              {saveNotice ? <p className="mt-3 text-sm text-emerald-200">Final scores saved.</p> : null}
            </article>
          </div>

          <div className="space-y-4 xl:col-span-3">
            {result.open_checks.map((check, index) => {
              const current = manualScores[check.question_id] ?? check.ai_score;
              return (
                <article
                  key={check.question_id}
                  className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-indigo-300">Open Question {index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{check.question_text}</h3>
                    </div>
                    <span className="rounded-full border border-cyan-300/40 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                      AI reviewed
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Student answer</p>
                    <p className="mt-2 text-sm text-slate-100">{check.student_answer || 'No answer submitted'}</p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">AI rationale</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cyan-100">
                        {check.ai_notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Scoring</p>
                      <p className="mt-2 text-sm text-slate-100">
                        AI suggested: {check.ai_score} / {check.max_score}
                      </p>
                      <div className="mt-3">
                        <label className="text-sm text-slate-200">
                          Teacher final: {current} / {check.max_score}
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={check.max_score}
                          value={current}
                          onChange={(event) =>
                            setManualScores((prev) => ({
                              ...prev,
                              [check.question_id]: Number(event.target.value),
                            }))
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </section>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${highlight ? 'border-cyan-300/45 bg-cyan-500/14' : 'border-slate-700 bg-slate-900/60'}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
