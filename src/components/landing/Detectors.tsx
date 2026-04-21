"use client";

import {
  Ghost,
  KeyRound,
  TrendingUp,
  Zap,
  MoonStar,
  GitCommitHorizontal,
} from "lucide-react";
import { FadeIn } from "./animations/FadeIn";
import { Sparkline } from "./animations/Sparkline";
import { useInView } from "./animations/useInView";
import { useReducedMotion } from "./animations/useReducedMotion";

interface Detector {
  icon: React.ComponentType<{ className?: string }>;
  severityLabel: string;
  severityTone: "critical" | "warning" | "info";
  title: string;
  rule: string;
  description: string;
  viz: "silent" | "errorRate" | "spike" | "consecutive" | "zombie" | "credential";
}

const detectors: Detector[] = [
  {
    icon: Zap,
    severityLabel: "Critical",
    severityTone: "critical",
    title: "Silent failure",
    rule: "0 executions in 7 days on an active automation",
    description:
      "The trigger stopped firing but the scenario still shows active. Runmend catches it the next time we sync.",
    viz: "silent",
  },
  {
    icon: TrendingUp,
    severityLabel: "Critical",
    severityTone: "critical",
    title: "High error rate",
    rule: "More than 30% failures in the last 24 hours",
    description:
      "Downstream API flaky, auth expired, or data shape changed — we surface it with the exact failure count.",
    viz: "errorRate",
  },
  {
    icon: TrendingUp,
    severityLabel: "Warning",
    severityTone: "warning",
    title: "Error spike",
    rule: "Error rate doubled vs. 7-day average",
    description:
      "Something changed today that wasn't broken yesterday. We flag the baseline shift before it becomes the new normal.",
    viz: "spike",
  },
  {
    icon: GitCommitHorizontal,
    severityLabel: "Critical",
    severityTone: "critical",
    title: "Consecutive failures",
    rule: "5+ failed runs in a row",
    description:
      "A streak of red is louder than a noisy error rate. We flag the exact streak length and the latest error message.",
    viz: "consecutive",
  },
  {
    icon: Ghost,
    severityLabel: "Info",
    severityTone: "info",
    title: "Zombie automation",
    rule: "Active but 0 executions in 30 days",
    description:
      "Left over from a migration or a forgotten test. Still counts against quota, still exposes credentials.",
    viz: "zombie",
  },
  {
    icon: KeyRound,
    severityLabel: "Warning",
    severityTone: "warning",
    title: "Credential expiration",
    rule: "Token expires within 7 days",
    description:
      "OAuth tokens and API keys that are about to go stale — caught before the next run silently fails.",
    viz: "credential",
  },
];

const toneClass = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  info: "text-sky-400 bg-sky-500/10 border-sky-500/20",
} as const;

function BarChart({ values, tone }: { values: number[]; tone: "critical" | "warning" | "ok" }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const max = Math.max(...values, 1);
  const color =
    tone === "critical" ? "#ef4444" : tone === "warning" ? "#f59e0b" : "#10b981";

  return (
    <div ref={ref} className="flex items-end gap-1 h-10">
      {values.map((v, i) => {
        const h = (v / max) * 100;
        const animate = inView && !reduced;
        return (
          <span
            key={i}
            className="w-1.5 rounded-sm"
            style={{
              backgroundColor: color,
              opacity: animate ? 1 : reduced ? 1 : 0,
              height: animate ? `${h}%` : reduced ? `${h}%` : "4%",
              transition: `height 700ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 55}ms, opacity 400ms ease ${i * 55}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function ConsecutiveDots() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  return (
    <div ref={ref} className="flex items-center gap-1.5 h-10">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const failed = i < 5;
        const animate = inView && !reduced;
        return (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${failed ? "bg-red-500" : "bg-muted"}`}
            style={{
              transform: animate ? "scale(1)" : reduced ? "scale(1)" : "scale(0)",
              transition: `transform 280ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 100}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function CredentialCountdown() {
  return (
    <div className="flex items-center justify-between h-10 rounded-md border border-amber-500/20 bg-amber-500/5 px-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[11px] font-mono text-amber-300">google_oauth</span>
      </div>
      <span className="text-[11px] font-semibold text-amber-300">expires in 6d</span>
    </div>
  );
}

function ZombieGlyph() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className="relative flex items-center h-10 gap-2 overflow-hidden"
    >
      <span
        className="text-sky-400/80"
        style={{
          opacity: inView && !reduced ? 1 : reduced ? 1 : 0.25,
          transition: "opacity 700ms ease",
        }}
      >
        <MoonStar className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <span
            className="block h-full bg-sky-500/40"
            style={{
              width: inView && !reduced ? "6%" : reduced ? "6%" : "0%",
              transition: "width 1200ms ease",
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
          0 runs · 30d
        </p>
      </div>
    </div>
  );
}

function SilentFlatline() {
  return (
    <div className="relative h-10">
      <Sparkline
        data={[24, 22, 20, 22, 21, 20, 6, 3, 2, 1, 1, 1, 1, 1]}
        tone="critical"
        width={220}
        height={40}
        className="w-full h-full"
      />
      <span
        aria-hidden="true"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-500 animate-pulse"
      />
    </div>
  );
}

function Viz({ kind }: { kind: Detector["viz"] }) {
  switch (kind) {
    case "silent":
      return <SilentFlatline />;
    case "errorRate":
      return (
        <BarChart values={[4, 5, 3, 6, 8, 12, 14, 18, 22, 26, 28, 32]} tone="critical" />
      );
    case "spike":
      return (
        <BarChart values={[4, 4, 5, 4, 5, 6, 5, 7, 14, 18, 22, 26]} tone="warning" />
      );
    case "consecutive":
      return <ConsecutiveDots />;
    case "zombie":
      return <ZombieGlyph />;
    case "credential":
      return <CredentialCountdown />;
  }
}

export function Detectors() {
  return (
    <section id="detectors" className="border-y border-border/50 bg-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Six detectors, always on
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The failure modes Make and n8n don&apos;t surface
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Every 15 minutes Runmend re-runs six rules across every connected
              workspace. Each rule has its own threshold, severity, and
              remediation hint.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {detectors.map((d, i) => {
            const Icon = d.icon;
            return (
              <FadeIn key={d.title} delay={i * 80}>
                <article className="group relative h-full rounded-xl border border-border/60 bg-card/40 p-5 overflow-hidden hover:border-border transition-colors">
                  {/* subtle corner glow */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        d.severityTone === "critical"
                          ? "rgba(239,68,68,0.15)"
                          : d.severityTone === "warning"
                            ? "rgba(245,158,11,0.15)"
                            : "rgba(56,189,248,0.15)",
                    }}
                  />
                  <div className="flex items-start justify-between mb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4.5 w-4.5 text-foreground/80" />
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${toneClass[d.severityTone]}`}
                    >
                      {d.severityLabel}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold mb-1">{d.title}</h3>
                  <p className="text-[11px] font-mono text-muted-foreground/80 mb-3">
                    {d.rule}
                  </p>

                  <div className="mb-4">
                    <Viz kind={d.viz} />
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {d.description}
                  </p>
                </article>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
