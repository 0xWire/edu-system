"use client";

import Link from "next/link";
import { DemoCard, DemoShell, demoNavItems } from "@/components/demo/DemoShell";

export default function DemoFlowIndexPage() {
  return (
    <DemoShell
      title="Video Demo Endpoints"
      subtitle="Use separate endpoints for a realistic role-based recording: teacher creates test with AI, student passes test, teacher reviews with AI scoring support."
      roleBadge="Recording mode"
      navItems={demoNavItems}
      activeHref="/demo-flow"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <DemoCard title="Step 1: Teacher in AI Studio" subtitle="Realistic input flow with materials and generation pipeline.">
          <p className="text-sm text-slate-200">
            Open the teacher studio page, fill materials, run AI generation, and copy the produced assignment link.
          </p>
          <Link
            href="/demo-flow/teacher-ai-studio"
            className="mt-4 inline-flex rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Open Teacher Studio
          </Link>
        </DemoCard>

        <DemoCard title="Step 2: Student Takes Test" subtitle="Different UI role with timer and submission.">
          <p className="text-sm text-slate-200">
            Switch to student endpoint, answer objective and open questions, and submit attempt.
          </p>
          <Link
            href="/demo-flow/student-attempt"
            className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Open Student Test
          </Link>
        </DemoCard>

        <DemoCard title="Step 3: Teacher Reviews + AI" subtitle="AI suggests score for open answers and helps final grading.">
          <p className="text-sm text-slate-200">
            Open teacher review dashboard, run AI evaluation, and accept or adjust the suggested score.
          </p>
          <Link
            href="/demo-flow/teacher-review"
            className="mt-4 inline-flex rounded-lg bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Open Teacher Review
          </Link>
        </DemoCard>
      </div>

      <DemoCard title="Suggested Recording Order" subtitle="Use these cuts for clean transition in final video.">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-200">
          <li>Start at `/demo-flow/teacher-ai-studio` and show AI generation.</li>
          <li>Cut to `/demo-flow/student-attempt` and submit one attempt.</li>
          <li>Cut to `/demo-flow/teacher-review` and run AI scoring for open answer.</li>
        </ol>
      </DemoCard>
    </DemoShell>
  );
}
