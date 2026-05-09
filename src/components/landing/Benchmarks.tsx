"use client";

import { BarChart3, Gauge, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

interface BenchmarkPreview {
  icon: LucideIcon;
  title: string;
  description: string;
  bars: number[];
}

const previews: BenchmarkPreview[] = [
  {
    icon: Gauge,
    title: "Error-rate percentile",
    description:
      "Where your average scenario sits versus the Make.com agency median.",
    bars: [25, 40, 55, 70, 90, 60, 38],
  },
  {
    icon: BarChart3,
    title: "Coverage quality",
    description:
      "How thoroughly your client stacks have alerts and field-mapping coverage versus peers.",
    bars: [20, 35, 50, 65, 80, 95, 70],
  },
  {
    icon: Timer,
    title: "Time-to-detect",
    description:
      "How fast Runmend catches your silent failures versus the cohort baseline.",
    bars: [80, 65, 50, 38, 28, 22, 18],
  },
];

export function Benchmarks() {
  return (
    <section id="benchmarks" className="bg-muted/10">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <FadeIn>
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-4">
              Coming soon
            </span>
            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Benchmarks
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How does your automation health compare to the median agency?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Every agency wonders if they are doing this well. Nobody can
              answer it because nobody can see across agencies. As Runmend
              audits more Make.com and n8n stacks, the aggregate becomes the
              answer — your numbers, in context.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {previews.map((p, i) => {
            const Icon = p.icon;
            return (
              <FadeIn key={p.title} delay={i * 90}>
                <div className="h-full rounded-xl border border-border/60 bg-card/30 p-5 flex flex-col opacity-70">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon
                      aria-hidden="true"
                      className="h-4 w-4 text-muted-foreground"
                    />
                    <h3 className="text-sm font-semibold">{p.title}</h3>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">
                    {p.description}
                  </p>
                  <div
                    aria-hidden="true"
                    className="mt-4 flex items-end gap-1 h-12"
                  >
                    {p.bars.map((h, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-sm bg-muted-foreground/20"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={400}>
          <div className="mt-10 text-center">
            <a
              href="mailto:hello@runmend.com?subject=Runmend%20benchmarks%20pilot"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium h-9 px-4 transition-colors"
            >
              Pilot agencies get benchmarks first
            </a>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Benchmarks unlock once we hit pilot density across Make and n8n
              agencies.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
