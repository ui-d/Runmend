"use client";

import {
  AlertTriangle,
  ShieldAlert,
  Activity,
  RefreshCw,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import { CountUp } from "./animations/CountUp";
import { Sparkline } from "./animations/Sparkline";
import { FadeIn } from "./animations/FadeIn";
import { useReducedMotion } from "./animations/useReducedMotion";
import { useInView } from "./animations/useInView";

interface ClientRow {
  name: string;
  platform: "Make.com" | "n8n";
  health: number;
  workflows: number;
  critical: number;
  warning: number;
  info: number;
  sparkline: number[];
  sparklineTone: "critical" | "warning" | "ok";
  topIssue: string | null;
}

const clients: ClientRow[] = [
  {
    name: "Coastal Content Agency",
    platform: "Make.com",
    health: 34,
    workflows: 47,
    critical: 3,
    warning: 2,
    info: 2,
    sparkline: [82, 78, 74, 71, 65, 58, 52, 48, 44, 40, 38, 36, 34, 34],
    sparklineTone: "critical",
    topIssue: "Webhook failure — client onboarding stopped 3 days ago",
  },
  {
    name: "GreenLeaf Commerce",
    platform: "Make.com",
    health: 62,
    workflows: 23,
    critical: 2,
    warning: 3,
    info: 1,
    sparkline: [74, 72, 70, 70, 66, 66, 64, 62, 60, 62, 62, 62, 62, 62],
    sparklineTone: "warning",
    topIssue: "Google OAuth token expires in 6 days",
  },
  {
    name: "Creator Stack",
    platform: "n8n",
    health: 78,
    workflows: 31,
    critical: 0,
    warning: 2,
    info: 3,
    sparkline: [70, 72, 71, 74, 75, 76, 77, 77, 78, 78, 78, 78, 78, 78],
    sparklineTone: "ok",
    topIssue: null,
  },
  {
    name: "InfraFlow DevOps",
    platform: "n8n",
    health: 91,
    workflows: 18,
    critical: 0,
    warning: 1,
    info: 1,
    sparkline: [86, 87, 88, 88, 89, 89, 90, 90, 90, 91, 91, 91, 91, 91],
    sparklineTone: "ok",
    topIssue: null,
  },
];

function healthColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function healthBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function healthDot(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function HealthRing({ score }: { score: number }) {
  const { ref, inView } = useInView<SVGSVGElement>();
  const reduced = useReducedMotion();
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const target = (score / 100) * circumference;
  const shouldAnimate = inView && !reduced;
  const offset = shouldAnimate ? circumference - target : reduced ? circumference - target : circumference;

  const strokeColor =
    score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg
        ref={ref}
        viewBox="0 0 80 80"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="40"
          cy="40"
          r={radius}
          strokeWidth="6"
          stroke="hsl(var(--muted))"
          fill="none"
          opacity="0.35"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          strokeWidth="6"
          stroke={strokeColor}
          strokeLinecap="round"
          fill="none"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 1600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${healthColor(score)}`}>
          <CountUp to={score} duration={1600} />
        </span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
          health
        </span>
      </div>
    </div>
  );
}

export function LiveMonitor() {
  const total = clients.reduce(
    (s, c) => s + c.critical + c.warning + c.info,
    0,
  );
  const criticals = clients.reduce((s, c) => s + c.critical, 0);
  const worst = clients.reduce((m, c) => Math.min(m, c.health), 100);

  return (
    <section className="max-w-5xl mx-auto px-4 pb-24">
      <FadeIn>
        <div className="relative rounded-xl border border-border/60 bg-background shadow-2xl shadow-black/40 overflow-hidden">
          {/* Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px rounded-xl opacity-60"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, rgba(239,68,68,0.08), transparent 70%)",
            }}
          />

          {/* Browser chrome */}
          <div className="relative flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400/70" />
              <span className="h-3 w-3 rounded-full bg-amber-400/70" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="rounded-md bg-muted px-4 py-1 text-xs text-muted-foreground/70 font-mono">
                app.runmend.com/app/acme/profiles
              </div>
            </div>
            <div className="w-[52px]" />
          </div>

          {/* Header row */}
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 pt-5">
            <div className="flex items-center gap-4">
              <HealthRing score={worst} />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Workspace pulse
                </p>
                <h3 className="text-lg font-semibold">Acme Automations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <CountUp to={clients.length} /> profiles ·{" "}
                  <CountUp
                    to={clients.reduce((s, c) => s + c.workflows, 0)}
                  />{" "}
                  automations monitored
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {criticals > 0 && (
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 border border-red-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-red-500" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <CountUp to={criticals} /> critical
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground border border-border/50">
                <Activity className="h-3 w-3" />
                <CountUp to={total} /> open
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 border border-emerald-500/20">
                <RefreshCw className="h-3 w-3" />
                Synced 2m ago
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="relative p-4 sm:p-6 pt-5 space-y-2">
            {clients.map((client, i) => (
              <FadeIn key={client.name} delay={120 + i * 90}>
                <div className="group rounded-lg border border-border/50 bg-muted/20 p-3 sm:p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${healthDot(client.health)}`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {client.name}
                        </span>
                        <span className="hidden sm:inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                          {client.platform}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {client.workflows} automations · last sync 2m ago
                      </p>
                    </div>

                    <div className="hidden md:block">
                      <Sparkline
                        data={client.sparkline}
                        tone={client.sparklineTone}
                        width={100}
                        height={26}
                      />
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      {client.critical > 0 && (
                        <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {client.critical}
                        </span>
                      )}
                      {client.warning > 0 && (
                        <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {client.warning}
                        </span>
                      )}
                      {client.info > 0 && (
                        <span className="flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400">
                          <Info className="h-2.5 w-2.5" />
                          {client.info}
                        </span>
                      )}
                    </div>

                    <div
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${healthColor(client.health)} ${healthBg(client.health)}`}
                    >
                      {client.health}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {client.topIssue && (
                    <div className="mt-2 ml-6 flex items-start gap-2 rounded-md bg-red-500/5 border border-red-500/10 px-3 py-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300/90 leading-relaxed">
                        {client.topIssue}
                      </p>
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Footer */}
          <FadeIn delay={clients.length * 90 + 200}>
            <div className="relative flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border/50 bg-muted/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground/70" />
                <span>
                  Claude wrote a new diagnostic report{" "}
                  <span className="text-foreground">2 minutes ago</span>
                </span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Next sync in <span className="text-foreground">13:02</span>
              </span>
            </div>
          </FadeIn>
        </div>
      </FadeIn>
    </section>
  );
}
