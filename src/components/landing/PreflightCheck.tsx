"use client";

import {
  Braces,
  ListChecks,
  Regex,
  ListFilter,
  Timer,
  Coins,
  Scale,
  GitCompareArrows,
} from "lucide-react";
import { FadeIn } from "./animations/FadeIn";
import { useInView } from "./animations/useInView";
import { useReducedMotion } from "./animations/useReducedMotion";

type Band = "structural" | "operational" | "semantic";

interface Assertion {
  icon: React.ComponentType<{ className?: string }>;
  band: Band;
  bandLabel: string;
  title: string;
  rule: string;
  description: string;
  note?: string;
  viz: "schema" | "field" | "regex" | "set" | "latency" | "cost" | "judge";
}

const assertions: Assertion[] = [
  {
    icon: Braces,
    band: "structural",
    bandLabel: "Structural",
    title: "json_schema_valid",
    rule: "Output validates against your JSON Schema",
    description:
      "The shape didn't drift. Catches a renamed key or a null where an object used to be, before it reaches a client.",
    viz: "schema",
  },
  {
    icon: ListChecks,
    band: "structural",
    bandLabel: "Structural",
    title: "field_present",
    rule: "A required field exists in the output",
    description:
      "The field a downstream step depends on is still there — not silently dropped by an upstream change.",
    viz: "field",
  },
  {
    icon: Regex,
    band: "structural",
    bandLabel: "Structural",
    title: "field_matches",
    rule: "A field matches a regex or exact value",
    description:
      "An invoice ID still looks like an invoice ID. Exact-match or pattern, your choice per field.",
    viz: "regex",
  },
  {
    icon: ListFilter,
    band: "structural",
    bandLabel: "Structural",
    title: "field_in_set",
    rule: "A field's value is one of an allowed set",
    description:
      "Status came back as one of the values your CRM accepts — not a new enum the model invented.",
    viz: "set",
  },
  {
    icon: Timer,
    band: "operational",
    bandLabel: "Operational",
    title: "latency_under_ms",
    rule: "Execution finished under a time budget",
    description:
      "A scenario that used to run in 2s now takes 40s. The output may be fine; the SLA isn't.",
    viz: "latency",
  },
  {
    icon: Coins,
    band: "operational",
    bandLabel: "Operational",
    title: "cost_under_cents",
    rule: "Token cost stayed under a cents budget",
    description:
      "A prompt tweak that doubled spend per run gets caught here, not on the invoice.",
    note: "n8n only — Make AI-node cost isn't exposed by the platform API yet.",
    viz: "cost",
  },
  {
    icon: Scale,
    band: "semantic",
    bandLabel: "Semantic",
    title: "llm_judge",
    rule: "Claude scores the output against your criterion",
    description:
      "For output that's valid but not good. Claude returns a score, a confidence, and its reasoning — optionally diffed against a baseline run.",
    viz: "judge",
  },
];

const bandClass: Record<Band, string> = {
  structural: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  operational: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  semantic: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const bandGlow: Record<Band, string> = {
  structural: "rgba(56,189,248,0.15)",
  operational: "rgba(139,92,246,0.15)",
  semantic: "rgba(16,185,129,0.15)",
};

function SchemaViz() {
  return (
    <div className="flex items-center gap-2 h-10 font-mono text-[11px] text-muted-foreground/80">
      <span className="text-sky-400">{"{ "}</span>
      <span>id, email, plan</span>
      <span className="text-sky-400">{" }"}</span>
      <span className="ml-auto inline-flex items-center gap-1 text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        valid
      </span>
    </div>
  );
}

function FieldViz() {
  return (
    <div className="flex items-center gap-1.5 h-10">
      {["customer_id", "amount", "currency"].map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] font-mono text-emerald-300"
        >
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          {f}
        </span>
      ))}
    </div>
  );
}

function RegexViz() {
  return (
    <div className="flex items-center justify-between h-10 rounded-md border border-sky-500/20 bg-sky-500/5 px-3 font-mono text-[11px]">
      <span className="text-sky-300">/^INV-\d{6}$/</span>
      <span className="text-emerald-400">INV-004217 ✓</span>
    </div>
  );
}

function SetViz() {
  const values = ["active", "trialing", "past_due", "canceled"];
  return (
    <div className="flex flex-wrap items-center gap-1.5 h-10 content-center">
      {values.map((v, i) => (
        <span
          key={v}
          className={`rounded-full px-2 py-0.5 text-[10px] font-mono border ${
            i === 1
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-border/60 text-muted-foreground/70"
          }`}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

function LatencyBar() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const animate = inView && !reduced;
  const pct = 64; // 1.9s of a 3s budget
  return (
    <div ref={ref} className="h-10 flex flex-col justify-center gap-1.5">
      <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
        <span
          className="block h-full rounded-full bg-violet-500/70"
          style={{
            width: animate ? `${pct}%` : reduced ? `${pct}%` : "0%",
            transition: "width 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 w-px bg-violet-300"
          style={{ left: "85%" }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground/70">
        <span>1.9s</span>
        <span>budget 3s</span>
      </div>
    </div>
  );
}

function CostMeter() {
  return (
    <div className="flex items-center justify-between h-10 rounded-md border border-violet-500/20 bg-violet-500/5 px-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
        <span className="text-[11px] font-mono text-violet-300">0.4¢ / run</span>
      </div>
      <span className="text-[11px] font-semibold text-violet-300">
        cap 5¢
      </span>
    </div>
  );
}

function JudgeGauge() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const animate = inView && !reduced;
  return (
    <div ref={ref} className="flex items-center gap-3 h-10">
      <div className="relative h-9 w-9 shrink-0">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/40"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-emerald-500"
            strokeDasharray="94.2"
            style={{
              strokeDashoffset: animate ? 94.2 * (1 - 0.92) : reduced ? 94.2 * (1 - 0.92) : 94.2,
              transition: "stroke-dashoffset 1000ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-300">
          0.92
        </span>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground/70 leading-snug">
        confidence 0.88 ·{" "}
        <span className="text-muted-foreground/90">
          &ldquo;tone matches the brand voice, all fields populated&rdquo;
        </span>
      </p>
    </div>
  );
}

function Viz({ kind }: { kind: Assertion["viz"] }) {
  switch (kind) {
    case "schema":
      return <SchemaViz />;
    case "field":
      return <FieldViz />;
    case "regex":
      return <RegexViz />;
    case "set":
      return <SetViz />;
    case "latency":
      return <LatencyBar />;
    case "cost":
      return <CostMeter />;
    case "judge":
      return <JudgeGauge />;
  }
}

export function PreflightCheck() {
  return (
    <section id="preflight" className="border-y border-border/50 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Pre-flight Check · Reliability Suite
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Catch bad output before your client does
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Detectors catch what already broke. Pre-flight Check replays real
              test inputs through a workflow and asserts the result is still
              right — <span className="text-foreground/80">before</span> the
              change ships. Seven assertion types, a Claude judge that scores
              quality against your own criteria, and drift tracking against a
              known-good baseline.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assertions.map((a, i) => {
            const Icon = a.icon;
            return (
              <FadeIn key={a.title} delay={i * 70}>
                <article className="group relative h-full rounded-xl border border-border/60 bg-card/40 p-5 overflow-hidden hover:border-border transition-colors">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: bandGlow[a.band] }}
                  />
                  <div className="flex items-start justify-between mb-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4.5 w-4.5 text-foreground/80" />
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${bandClass[a.band]}`}
                    >
                      {a.bandLabel}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold font-mono mb-1">
                    {a.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/80 mb-3">
                    {a.rule}
                  </p>

                  <div className="mb-4">
                    <Viz kind={a.viz} />
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {a.description}
                  </p>
                  {a.note && (
                    <p className="mt-2 text-[11px] text-amber-400/80">
                      {a.note}
                    </p>
                  )}
                </article>
              </FadeIn>
            );
          })}

          <FadeIn delay={assertions.length * 70}>
            <article className="relative h-full rounded-xl border border-border/60 bg-card/40 p-5 flex flex-col justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted mb-4">
                <GitCompareArrows className="h-4.5 w-4.5 text-foreground/80" />
              </span>
              <h3 className="text-base font-semibold mb-1">
                Baseline drift, not just pass/fail
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every run is diffed against a known-good baseline. Once a
                scenario has 20+ inputs, Runmend reports a drift % — so you
                catch slow regressions, not only hard failures.
              </p>
            </article>
          </FadeIn>
        </div>

        <FadeIn delay={400}>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Pre-flight Check is on{" "}
            <span className="text-foreground/80">Pro</span> — 5 scenarios · 50
            runs/mo — and{" "}
            <span className="text-foreground/80">Agency</span> — 50 scenarios ·
            500 runs/mo.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
