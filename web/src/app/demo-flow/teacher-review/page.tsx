"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DemoCard,
  DemoInfo,
  DemoShell,
  demoNavItems,
} from "@/components/demo/DemoShell";
import {
  DEMO_STORAGE_KEY,
  baseTeacherAttempts,
  demoAssignment,
  evaluateOpenAnswerAI,
  type DemoAttempt,
} from "@/components/demo/scenario";

type AIResult = {
  suggestedScore: number;
  maxScore: number;
  rationale: string[];
};

export default function DemoTeacherReviewPage() {
  const [assignmentId, setAssignmentId] = useState(demoAssignment.id);

  const [attempts, setAttempts] = useState<DemoAttempt[]>(baseTeacherAttempts);
  const [selectedId, setSelectedId] = useState<string>(baseTeacherAttempts[0]?.id || "");
  const [aiRunning, setAIRunning] = useState(false);
  const [aiResult, setAIResult] = useState<AIResult | null>(null);
  const [manualScore, setManualScore] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("assignment");
    if (value) {
      setAssignmentId(value);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DemoAttempt;
      if (!parsed.id || !parsed.assignmentId) return;

      setAttempts((prev) => {
        const withoutSame = prev.filter((attempt) => attempt.id !== parsed.id);
        return [parsed, ...withoutSame];
      });
      setSelectedId(parsed.id);
    } catch {
      // ignore parse errors in demo mode
    }
  }, []);

  const selectedAttempt = useMemo(
    () => attempts.find((attempt) => attempt.id === selectedId) || attempts[0],
    [attempts, selectedId]
  );

  useEffect(() => {
    if (!selectedAttempt) return;
    if (typeof selectedAttempt.openScore === "number") {
      setManualScore(selectedAttempt.openScore);
      setAIResult(null);
    } else {
      setManualScore(0);
    }
  }, [selectedAttempt]);

  const runAIReview = () => {
    if (!selectedAttempt || aiRunning) return;

    setAIRunning(true);
    setAIResult(null);

    window.setTimeout(() => {
      const evaluated = evaluateOpenAnswerAI(selectedAttempt.openAnswer || "");
      setAIResult(evaluated);
      setManualScore(evaluated.suggestedScore);
      setAIRunning(false);
    }, 1800);
  };

  const applyScore = (score: number) => {
    if (!selectedAttempt) return;

    setAttempts((prev) =>
      prev.map((attempt) =>
        attempt.id === selectedAttempt.id
          ? {
              ...attempt,
              openScore: score,
              status: "graded",
            }
          : attempt
      )
    );
  };

  const totalSummary = useMemo(() => {
    return attempts.map((attempt) => {
      const totalMax = attempt.objectiveMax + attempt.openMax;
      const totalScore = attempt.objectiveScore + (attempt.openScore || 0);
      return { id: attempt.id, totalScore, totalMax };
    });
  }, [attempts]);

  return (
    <DemoShell
      title="Teacher Review Dashboard"
      subtitle="Teacher sees student attempts and uses AI to evaluate open-ended responses before final grading."
      roleBadge="Role: Teacher"
      navItems={demoNavItems}
      activeHref="/demo-flow/teacher-review"
    >
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <DemoCard title="Attempts List" subtitle="Students who completed assignment.">
            <div className="space-y-2">
              {attempts.map((attempt) => {
                const summary = totalSummary.find((row) => row.id === attempt.id);
                const isSelected = selectedAttempt?.id === attempt.id;

                return (
                  <button
                    key={attempt.id}
                    type="button"
                    onClick={() => setSelectedId(attempt.id)}
                    className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-cyan-300/50 bg-cyan-500/14 text-cyan-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-300/30"
                    }`}
                  >
                    <span>{attempt.studentName}</span>
                    <span>
                      {summary ? `${summary.totalScore} / ${summary.totalMax}` : "-"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        attempt.status === "graded"
                          ? "bg-emerald-500/20 text-emerald-100"
                          : attempt.status === "reviewed"
                            ? "bg-cyan-500/20 text-cyan-100"
                            : "bg-amber-500/20 text-amber-100"
                      }`}
                    >
                      {attempt.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </DemoCard>

          <DemoCard title="Selected Attempt" subtitle="Open response that requires grading support.">
            {selectedAttempt ? (
              <div className="space-y-3 text-sm">
                <DemoInfo label="Student" value={selectedAttempt.studentName} />
                <DemoInfo label="Assignment" value={selectedAttempt.assignmentId} />
                <DemoInfo label="Objective score" value={`${selectedAttempt.objectiveScore} / ${selectedAttempt.objectiveMax}`} />
                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-slate-200">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Open answer text</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedAttempt.openAnswer || "No answer provided"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300">No attempts loaded.</p>
            )}
          </DemoCard>
        </div>

        <div className="space-y-5 xl:col-span-2">
          <DemoCard title="AI Grading Assistant" subtitle="AI proposes rubric-based score; teacher makes final decision.">
            <div className="space-y-3 text-sm text-slate-200">
              <button
                type="button"
                onClick={runAIReview}
                disabled={!selectedAttempt || aiRunning}
                className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              >
                {aiRunning ? "AI is evaluating..." : "Run AI review"}
              </button>

              {aiResult ? (
                <>
                  <DemoInfo
                    label="AI suggested score"
                    value={`${aiResult.suggestedScore} / ${aiResult.maxScore}`}
                    highlight
                  />
                  <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/12 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">AI rationale</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cyan-100">
                      {aiResult.rationale.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-300">Run AI review to generate explanation and suggested score.</p>
              )}

              <label className="block">
                <span className="text-slate-300">Teacher final open-question score: {manualScore}</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={manualScore}
                  onChange={(e) => setManualScore(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyScore(aiResult?.suggestedScore ?? manualScore)}
                  disabled={!selectedAttempt}
                  className="rounded-lg bg-emerald-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Accept AI score
                </button>
                <button
                  type="button"
                  onClick={() => applyScore(manualScore)}
                  disabled={!selectedAttempt}
                  className="rounded-lg border border-slate-500 px-3 py-2 font-semibold text-slate-100 disabled:opacity-50"
                >
                  Apply manual score
                </button>
              </div>
            </div>
          </DemoCard>

          <DemoCard title="Flow Links" subtitle="Quick switches for editing video transitions.">
            <div className="space-y-2 text-sm">
              <DemoInfo label="Current assignment" value={assignmentId} />
              <Link
                href="/demo-flow/teacher-ai-studio"
                className="block rounded-lg border border-slate-500 px-3 py-2 font-semibold text-slate-100"
              >
                Back to teacher AI studio
              </Link>
              <Link
                href={`/demo-flow/student-attempt?assignment=${assignmentId}`}
                className="block rounded-lg border border-slate-500 px-3 py-2 font-semibold text-slate-100"
              >
                Open student endpoint
              </Link>
            </div>
          </DemoCard>
        </div>
      </div>
    </DemoShell>
  );
}
