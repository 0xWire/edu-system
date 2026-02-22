"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DemoCard,
  DemoInfo,
  DemoShell,
  demoNavItems,
} from "@/components/demo/DemoShell";
import {
  demoAssignment,
  demoMaterial,
  generationSteps,
} from "@/components/demo/scenario";

export default function DemoTeacherAIStudioPage() {
  const [materialTitle, setMaterialTitle] = useState(demoMaterial.title);
  const [sourceUrl, setSourceUrl] = useState(demoMaterial.sourceUrl);
  const [materialText, setMaterialText] = useState(demoMaterial.text);
  const [language, setLanguage] = useState(demoMaterial.language);
  const [note, setNote] = useState(demoMaterial.note);

  const [questionsCount, setQuestionsCount] = useState("12");
  const [difficulty, setDifficulty] = useState("mixed");
  const [audience, setAudience] = useState("first-year university students");

  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= generationSteps.length) {
          return prev;
        }
        return prev + 1;
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (currentStep < generationSteps.length) return;

    setRunning(false);
    setFinished(true);
  }, [currentStep, running]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const sharePath = `/demo-flow/student-attempt?assignment=${demoAssignment.id}`;
  const reviewPath = `/demo-flow/teacher-review?assignment=${demoAssignment.id}`;
  const shareUrl = `${origin}${sharePath}`;

  const progress = useMemo(() => {
    if (!running && !finished) return 0;
    if (finished) return 100;
    return Math.round((currentStep / generationSteps.length) * 100);
  }, [currentStep, finished, running]);

  const startGeneration = () => {
    if (!materialTitle.trim() || !materialText.trim()) {
      return;
    }
    setCurrentStep(0);
    setFinished(false);
    setRunning(true);
  };

  const fillDemoData = () => {
    setMaterialTitle(demoMaterial.title);
    setSourceUrl(demoMaterial.sourceUrl);
    setMaterialText(demoMaterial.text);
    setLanguage(demoMaterial.language);
    setNote(demoMaterial.note);
    setQuestionsCount("12");
    setDifficulty("mixed");
    setAudience("first-year university students");
  };

  const copyShareLink = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareUrl || sharePath);
      setCopied(true);
    } catch {
      // ignore clipboard errors for demo
    }
  };

  return (
    <DemoShell
      title="Teacher AI Studio"
      subtitle="Simulated but realistic workflow: teacher edits source materials, runs AI pipeline, receives assignment link for students."
      roleBadge="Role: Teacher"
      navItems={demoNavItems}
      activeHref="/demo-flow/teacher-ai-studio"
    >
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          <DemoCard title="Material Input" subtitle="Teacher controls the exact content used for generation.">
            <div className="grid gap-3 text-sm">
              <label>
                <span className="text-slate-300">Material title</span>
                <input
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label>
                <span className="text-slate-300">Main source URL</span>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label>
                <span className="text-slate-300">Teacher prompt / material text</span>
                <textarea
                  rows={6}
                  value={materialText}
                  onChange={(e) => setMaterialText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-slate-300">Language</span>
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
                <label>
                  <span className="text-slate-300">Teacher note</span>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
              </div>
            </div>
          </DemoCard>

          <DemoCard title="Generation Config" subtitle="Teacher sets difficulty and assessment shape.">
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <label>
                <span className="text-slate-300">Questions</span>
                <input
                  value={questionsCount}
                  onChange={(e) => setQuestionsCount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                />
              </label>
              <label>
                <span className="text-slate-300">Difficulty</span>
                <input
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                />
              </label>
              <label>
                <span className="text-slate-300">Audience</span>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-2 text-white outline-none focus:border-cyan-300/50"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startGeneration}
                disabled={running}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {running ? "AI is generating..." : "Generate test with AI"}
              </button>
              <button
                type="button"
                onClick={fillDemoData}
                className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100"
              >
                Reset demo values
              </button>
            </div>
          </DemoCard>
        </div>

        <div className="space-y-5 xl:col-span-2">
          <DemoCard title="AI Pipeline Status" subtitle="Live generation trace for video recording.">
            <div className="space-y-2">
              {generationSteps.map((step, idx) => {
                const done = currentStep > idx || finished;
                const active = running && currentStep === idx + 1;
                return (
                  <div
                    key={step}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      done
                        ? "border-emerald-300/40 bg-emerald-500/14 text-emerald-100"
                        : active
                          ? "border-cyan-300/40 bg-cyan-500/14 text-cyan-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-300"
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </DemoCard>

          <DemoCard title="Generated Result" subtitle="Teacher receives assignment and share link.">
            {!finished ? (
              <p className="text-sm text-slate-300">Run generation to show the final result block.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <DemoInfo label="Assignment" value={demoAssignment.title} />
                <DemoInfo label="Course" value={demoAssignment.course} />
                <DemoInfo label="Duration" value={`${demoAssignment.durationMin} minutes`} />
                <DemoInfo label="Composition" value={`${questionsCount} questions (objective + open)`} />

                <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/12 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Student Link</p>
                  <p className="mt-1 break-all text-sm text-cyan-100">{shareUrl || sharePath}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    Copy link
                  </button>
                  <Link
                    href={sharePath}
                    className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100"
                  >
                    Open student window
                  </Link>
                  <Link
                    href={reviewPath}
                    className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-100"
                  >
                    Open teacher review
                  </Link>
                </div>

                {copied ? <p className="text-xs text-emerald-200">Link copied to clipboard.</p> : null}
              </div>
            )}
          </DemoCard>
        </div>
      </div>
    </DemoShell>
  );
}
