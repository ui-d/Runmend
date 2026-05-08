"use client";

import { useState } from "react";
import { Sparkles, Brain, ShieldAlert, ListChecks } from "lucide-react";
import { Typewriter } from "./animations/Typewriter";
import { FadeIn } from "./animations/FadeIn";

const overallHealth =
  "Three of your four client workspaces are healthy. Coastal Content Agency has slipped into the red and needs attention first.";

const mostDangerousIssue =
  "A Make.com webhook on Coastal's client-onboarding scenario has not received a payload in 72 hours. New customers are being created in Stripe but not provisioned in your CRM — an estimated $3.4k in onboarding work is stalled.";

const recommendations = [
  "Re-test the onboarding webhook from the Make.com scenario editor and watch for the expected payload.",
  "Rotate the Google OAuth token on GreenLeaf Commerce before it expires in 6 days.",
  "Archive the 4 zombie automations on Coastal — they have not run in 30+ days and are holding stale credentials.",
];

export function DiagnosticReport() {
  const [step, setStep] = useState(0);

  return (
    <section className="max-w-5xl mx-auto px-4 py-24">
      <FadeIn>
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            AI diagnostic report
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Runmend writes the post-mortem before you open the tab
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            After every sync, Runmend feeds execution stats, error patterns,
            and open issues into Claude and gets back a structured report you
            can forward to a client in one click.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={120}>
        <div className="relative mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/50 p-6 sm:p-8 overflow-hidden shadow-2xl shadow-black/30">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full blur-3xl"
            style={{ background: "rgba(139,92,246,0.10)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-10 h-52 w-52 rounded-full blur-3xl"
            style={{ background: "rgba(56,189,248,0.08)" }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between pb-5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Brain className="h-4.5 w-4.5 text-foreground/80" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </span>
              <div>
                <p className="text-sm font-semibold">Diagnostic — Acme Automations</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  generated 2 min ago · Claude Sonnet
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              cached · 58m left
            </span>
          </div>

          {/* Body */}
          <div className="relative pt-6 space-y-6">
            {/* Overall health */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
                Overall health
              </p>
              <p className="text-[15px] leading-relaxed text-foreground/90">
                <Typewriter
                  text={overallHealth}
                  speed={12}
                  onDone={() => setStep((s) => Math.max(s, 1))}
                />
              </p>
            </div>

            {/* Most dangerous issue */}
            <div
              style={{
                opacity: step >= 1 ? 1 : 0,
                transform: step >= 1 ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 500ms ease, transform 500ms ease",
              }}
            >
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-red-300 font-semibold mb-2">
                <ShieldAlert className="h-3 w-3" />
                Most dangerous issue
              </p>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-[14px] leading-relaxed text-red-100/90">
                  {step >= 1 ? (
                    <Typewriter
                      text={mostDangerousIssue}
                      speed={10}
                      delay={200}
                      onDone={() => setStep((s) => Math.max(s, 2))}
                    />
                  ) : null}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div
              style={{
                opacity: step >= 2 ? 1 : 0,
                transform: step >= 2 ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 500ms ease, transform 500ms ease",
              }}
            >
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
                <ListChecks className="h-3 w-3" />
                Recommendations
              </p>
              <ul className="space-y-2.5">
                {recommendations.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed"
                    style={{
                      opacity: step >= 2 ? 1 : 0,
                      transform: step >= 2 ? "translateY(0)" : "translateY(6px)",
                      transition: `opacity 500ms ease ${300 + i * 180}ms, transform 500ms ease ${300 + i * 180}ms`,
                    }}
                  >
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-foreground/60 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="relative mt-7 pt-4 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Generated from <span className="font-mono text-foreground/80">247 executions</span>
            </span>
            <span className="hidden sm:inline">Claude Sonnet</span>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
