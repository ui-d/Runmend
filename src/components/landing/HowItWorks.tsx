"use client";

import { Plug, ScanLine, Sparkles } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

const steps = [
  {
    icon: Plug,
    step: "01",
    title: "Connect",
    time: "under 60 seconds",
    description:
      "Drop in a Make.com API key or an n8n instance URL + key. We store it encrypted with AES-256-GCM and never write it to logs.",
  },
  {
    icon: ScanLine,
    step: "02",
    title: "Detect",
    time: "every 15 minutes, automatically",
    description:
      "Six rules run on every sync — silent failure, high error rate, error spike, consecutive failures, zombie automation, credential expiration.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Diagnose",
    time: "one click from a client-ready report",
    description:
      "Claude reads the execution stats, open issues and error patterns and writes a three-part diagnostic: overall health, the most dangerous issue, and what to do next.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-20">
      <FadeIn>
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps from blind to briefed
          </h2>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        <div
          aria-hidden="true"
          className="hidden md:block absolute left-0 right-0 top-8 h-px"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, hsl(var(--border)) 0 6px, transparent 6px 14px)",
          }}
        />
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <FadeIn key={s.title} delay={i * 120}>
              <article className="relative rounded-xl border border-border/60 bg-card/30 p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground/70">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mt-0.5 mb-3">
                  {s.time}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </article>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
