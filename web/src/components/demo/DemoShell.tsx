"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

const displayFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const monoFont = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

type NavItem = {
  href: string;
  label: string;
};

type DemoShellProps = {
  title: string;
  subtitle: string;
  roleBadge: string;
  navItems: NavItem[];
  activeHref: string;
  children: ReactNode;
};

export function DemoShell({ title, subtitle, roleBadge, navItems, activeHref, children }: DemoShellProps) {
  return (
    <main
      className={`${displayFont.className} min-h-screen px-4 py-6 sm:px-8 sm:py-8`}
      style={{ background: "radial-gradient(circle at 8% 2%, #102443 0%, #0b1220 42%, #030712 100%)" }}
    >
      <style jsx global>{`
        @keyframes demoFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <section className="mx-auto w-full max-w-7xl rounded-3xl border border-cyan-200/15 bg-slate-950/65 p-5 backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Demo Scenario</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{subtitle}</p>
          </div>
          <div className={`${monoFont.className} rounded-xl border border-cyan-200/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100`}>
            <p>University Math Demo</p>
            <p>{roleBadge}</p>
          </div>
        </div>

        <nav className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {navItems.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-cyan-300/45 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/35 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="mx-auto mt-6 w-full max-w-7xl" style={{ animation: "demoFadeIn 250ms ease" }}>
        {children}
      </section>
    </main>
  );
}

export function DemoCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function DemoInfo({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${highlight ? "border-cyan-300/35 bg-cyan-500/12" : "border-slate-700 bg-slate-900/70"}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

export const demoNavItems: NavItem[] = [
  { href: "/demo-flow", label: "Scene Index" },
  { href: "/demo-flow/teacher-ai-studio", label: "Teacher: AI Studio" },
  { href: "/demo-flow/student-attempt", label: "Student: Test" },
  { href: "/demo-flow/teacher-review", label: "Teacher: Review" },
];
