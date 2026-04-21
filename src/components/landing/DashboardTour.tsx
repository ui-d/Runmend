"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Plug,
  BellRing,
  Mail,
  Clock,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { FadeIn } from "./animations/FadeIn";
import { Sparkline } from "./animations/Sparkline";
import { useInView } from "./animations/useInView";
import { useReducedMotion } from "./animations/useReducedMotion";

type TabId = "triage" | "connections" | "alerts";
const TABS: { id: TabId; label: string; blurb: string }[] = [
  {
    id: "triage",
    label: "Profiles triage",
    blurb: "Dense table · worst-first · bulk actions",
  },
  {
    id: "connections",
    label: "Connections catalog",
    blurb: "Live health · reliability sparklines · auth status",
  },
  {
    id: "alerts",
    label: "Alerts",
    blurb: "Per-channel · severity routing · quiet hours",
  },
];

const AUTO_ADVANCE_MS = 5200;

function TriageMockup() {
  const rows = [
    {
      name: "Coastal Content Agency",
      industry: "Content agency · 12 seats",
      platform: "Make.com",
      health: 34,
      delta: -18,
      issues: { c: 3, w: 2, i: 2 },
      spark: [82, 78, 70, 58, 48, 40, 34],
      sparkTone: "critical" as const,
      fresh: "2 min",
      freshTone: "emerald",
    },
    {
      name: "GreenLeaf Commerce",
      industry: "Ecommerce · 6 seats",
      platform: "Make.com",
      health: 62,
      delta: -4,
      issues: { c: 2, w: 3, i: 1 },
      spark: [74, 72, 70, 66, 64, 62, 62],
      sparkTone: "warning" as const,
      fresh: "12 min",
      freshTone: "emerald",
    },
    {
      name: "Creator Stack",
      industry: "Media · 3 seats",
      platform: "n8n",
      health: 78,
      delta: +3,
      issues: { c: 0, w: 2, i: 3 },
      spark: [70, 72, 74, 75, 77, 78, 78],
      sparkTone: "ok" as const,
      fresh: "1h",
      freshTone: "amber",
    },
    {
      name: "InfraFlow DevOps",
      industry: "DevOps · 2 seats",
      platform: "n8n",
      health: 91,
      delta: +1,
      issues: { c: 0, w: 1, i: 1 },
      spark: [86, 87, 88, 90, 91, 91, 91],
      sparkTone: "ok" as const,
      fresh: "4 min",
      freshTone: "emerald",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4 pb-3 border-b border-border/50">
        <div className="relative flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
          <Search className="h-3 w-3" />
          <span className="font-mono">coastal</span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 bg-muted px-1 rounded">
            /
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-0.5 text-[10px] font-medium">
          Needs attention · 2
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/50 text-muted-foreground px-2 py-0.5 text-[10px]">
          Criticals · 5
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/50 text-muted-foreground px-2 py-0.5 text-[10px]">
          Stale sync · 1
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/50 text-muted-foreground px-2 py-0.5 text-[10px]">
          Healthy · 2
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr,90px,130px,90px,80px] gap-3 px-4 sm:px-5 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 border-b border-border/50">
        <span>Profile</span>
        <span>Platform</span>
        <span>Health · 14d</span>
        <span>Issues</span>
        <span className="text-right">Last sync</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {rows.map((r, i) => {
          const healthColor =
            r.health >= 80
              ? "text-emerald-400"
              : r.health >= 60
                ? "text-amber-400"
                : "text-red-400";
          const barColor =
            r.health >= 80
              ? "bg-emerald-500"
              : r.health >= 60
                ? "bg-amber-500"
                : "bg-red-500";
          const freshClass =
            r.freshTone === "emerald" ? "text-emerald-400" : "text-amber-400";
          return (
            <div
              key={r.name}
              className="relative grid grid-cols-[1fr,90px,130px,90px,80px] items-center gap-3 px-4 sm:px-5 py-2.5 text-sm hover:bg-muted/20 transition-colors"
            >
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1 bottom-1 w-[3px] rounded-r ${barColor}`}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {r.industry}
                </p>
              </div>
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground w-fit">
                {r.platform}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-bold ${healthColor}`}>
                  {r.health}
                </span>
                <Sparkline
                  data={r.spark}
                  tone={r.sparkTone}
                  width={54}
                  height={18}
                />
                <span
                  className={`text-[10px] font-mono inline-flex items-center ${r.delta < 0 ? "text-red-400" : "text-emerald-400"}`}
                >
                  {r.delta < 0 ? (
                    <ArrowDown className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowUp className="h-2.5 w-2.5" />
                  )}
                  {Math.abs(r.delta)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {r.issues.c > 0 && (
                  <span className="flex items-center gap-0.5 rounded bg-red-500/10 px-1 py-0.5 text-[10px] font-medium text-red-400">
                    {r.issues.c}c
                  </span>
                )}
                {r.issues.w > 0 && (
                  <span className="flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.5 text-[10px] font-medium text-amber-400">
                    {r.issues.w}w
                  </span>
                )}
                {r.issues.i > 0 && (
                  <span className="flex items-center gap-0.5 rounded bg-sky-500/10 px-1 py-0.5 text-[10px] font-medium text-sky-400">
                    {r.issues.i}i
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] font-mono text-right ${freshClass}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {r.fresh}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectionsMockup() {
  const connected = [
    {
      name: "Make.com · EU",
      auth: "API key · acme-prod",
      status: "Healthy",
      statusClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      spark: [99, 98, 100, 99, 100, 100, 99, 100, 100],
      sparkTone: "ok" as const,
      failRate: "0.4%",
      accentBg:
        "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.02))",
      logo: "M",
      logoBg: "bg-violet-500/15 text-violet-400",
    },
    {
      name: "n8n · self-hosted",
      auth: "API key · ops.acme.io",
      status: "Token expires · 6d",
      statusClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      spark: [94, 92, 95, 90, 88, 86, 90, 94, 92],
      sparkTone: "warning" as const,
      failRate: "2.1%",
      accentBg:
        "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.02))",
      logo: "n",
      logoBg: "bg-orange-500/15 text-orange-400",
    },
  ];

  const available = [
    { label: "Zapier", votes: 184 },
    { label: "Pipedream", votes: 96 },
    { label: "Workato", votes: 44 },
  ];

  return (
    <div className="p-4 sm:p-5 space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
          Connected · 2 of 3 seats
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connected.map((c) => (
            <div
              key={c.name}
              className="relative rounded-xl border border-border/60 p-4 overflow-hidden"
              style={{ background: c.accentBg }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.logoBg} font-bold`}
                >
                  {c.logo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {c.auth}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${c.statusClass}`}
                >
                  {c.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex-1 max-w-[140px]">
                  <Sparkline
                    data={c.spark}
                    tone={c.sparkTone}
                    width={140}
                    height={24}
                  />
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    Fail rate 24h
                  </p>
                  <p className="text-[12px] font-mono font-semibold">
                    {c.failRate}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
          Coming soon · vote to prioritize
        </p>
        <div className="grid grid-cols-3 gap-3">
          {available.map((a) => (
            <div
              key={a.label}
              className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-3 text-center"
            >
              <p className="text-[12px] font-semibold">{a.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {a.votes} votes · notify me
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsMockup() {
  const channels = [
    {
      icon: Mail,
      name: "Email",
      on: true,
      severities: ["Critical", "Warning"],
    },
    {
      icon: BellRing,
      name: "In-app",
      on: true,
      severities: ["Critical", "Warning", "Info"],
    },
  ];
  return (
    <div className="grid grid-cols-[200px,1fr] min-h-full">
      {/* Left rail */}
      <aside className="border-r border-border/50 bg-muted/10 p-3 text-[12px]">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-2 mb-2">
          Workspace
        </p>
        <ul className="space-y-0.5">
          <li className="px-2 py-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
            General
          </li>
          <li className="px-2 py-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
            Team
          </li>
          <li className="px-2 py-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
            Integrations
          </li>
        </ul>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-2 mt-4 mb-2">
          You
        </p>
        <ul className="space-y-0.5">
          <li className="px-2 py-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
            Profile
          </li>
          <li className="inline-flex w-full items-center gap-2 bg-accent text-accent-foreground font-medium px-2 py-1.5 rounded">
            <BellRing className="h-3.5 w-3.5" />
            Alerts
          </li>
        </ul>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-2 mt-4 mb-2">
          Advanced
        </p>
        <ul className="space-y-0.5">
          <li className="px-2 py-1.5 rounded text-muted-foreground">API</li>
          <li className="px-2 py-1.5 rounded text-red-400/70">Danger zone</li>
        </ul>
      </aside>

      {/* Right content */}
      <div className="p-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold">Alert routing</h4>
          <p className="text-[11px] text-muted-foreground">
            Decide which severities reach which channels.
          </p>
        </div>

        {channels.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.name}
              className="rounded-lg border border-border/60 bg-card/30 p-3 flex items-center gap-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <Icon className="h-4 w-4 text-foreground/80" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium">{c.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0 text-[9px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ON
                  </span>
                </div>
                <div className="flex gap-1 mt-1">
                  {c.severities.map((sev) => (
                    <span
                      key={sev}
                      className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                    >
                      {sev}
                    </span>
                  ))}
                </div>
              </div>
              <span className="relative inline-flex h-5 w-9 rounded-full bg-emerald-500/30 border border-emerald-500/40">
                <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400" />
              </span>
            </div>
          );
        })}

        <div className="rounded-lg border border-border/60 bg-card/30 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[12px] font-medium">Quiet hours</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            9:00 PM → 7:00 AM · Europe/Warsaw
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardTour() {
  const [active, setActive] = useState<TabId>("triage");
  const [paused, setPaused] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>({ once: false });
  const reduced = useReducedMotion();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!inView || paused || reduced) return;
    intervalRef.current = setInterval(() => {
      setActive((prev) => {
        const ids = TABS.map((t) => t.id);
        return ids[(ids.indexOf(prev) + 1) % ids.length];
      });
    }, AUTO_ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [inView, paused, reduced]);

  const activeIdx = TABS.findIndex((t) => t.id === active);

  return (
    <section className="max-w-5xl mx-auto px-4 py-24">
      <FadeIn>
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            Inside the app
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Every surface built for triage, not dashboards
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Worst-first rows. Real health deltas. Channel-aware alerts. No
            vanity metrics.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={120}>
        <div
          ref={ref}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="rounded-2xl border border-border/60 bg-card/30 overflow-hidden shadow-2xl shadow-black/30"
        >
          {/* Tab strip */}
          <div className="relative flex items-stretch border-b border-border/50 bg-muted/20">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={`relative flex-1 px-4 py-3 text-left text-sm transition-colors ${
                  active === t.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                <p className="text-[13px] font-semibold flex items-center gap-2">
                  {t.id === "triage" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {t.id === "connections" && <Plug className="h-3.5 w-3.5" />}
                  {t.id === "alerts" && <BellRing className="h-3.5 w-3.5" />}
                  {t.label}
                </p>
                <p className="text-[11px] text-muted-foreground/70 hidden sm:block mt-0.5">
                  {t.blurb}
                </p>
              </button>
            ))}
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-[2px] bg-foreground/80 rounded-full"
              style={{
                width: `${100 / TABS.length}%`,
                left: `${(activeIdx * 100) / TABS.length}%`,
                transition: "left 500ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>

          {/* Active surface */}
          <div className="relative bg-background/60 min-h-[420px]">
            <div
              key={active}
              className="animate-in fade-in"
              style={{
                animation: reduced
                  ? undefined
                  : "fadeIn 500ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {active === "triage" && <TriageMockup />}
              {active === "connections" && <ConnectionsMockup />}
              {active === "alerts" && <AlertsMockup />}
            </div>
          </div>

          {/* Progress + caption */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/10 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              Stylized preview · real surfaces ship today
            </span>
            <span className="inline-flex items-center gap-1">
              {TABS.map((t) => (
                <span
                  key={t.id}
                  className={`h-1 w-6 rounded-full transition-colors ${active === t.id ? "bg-foreground/70" : "bg-foreground/15"}`}
                />
              ))}
              <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/60" />
            </span>
          </div>
        </div>
      </FadeIn>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
