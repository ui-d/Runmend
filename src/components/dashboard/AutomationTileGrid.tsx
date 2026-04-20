"use client";

import { ExternalLink } from "lucide-react";
import type { AutomationIssue, Platform } from "@/lib/types";
import {
  buildScenarioUrl,
  type ConnectionUrlContext,
} from "@/lib/platform-adapters/urls";
import { getPlatformLabel } from "@/lib/types";
import {
  computeHealthDot,
  type HealthDot,
} from "@/lib/dashboard/derivations";

export interface AutomationTile {
  id: string;
  externalId: string;
  name: string;
  status: string;
  lastRunAt: string | null;
  totalRuns: number;
  failedRuns: number;
}

interface AutomationTileGridProps {
  automations: AutomationTile[];
  issues: AutomationIssue[];
  platform: Platform;
  connection?: ConnectionUrlContext | null;
}

export function AutomationTileGrid({
  automations,
  issues,
  platform,
  connection,
}: AutomationTileGridProps) {
  if (automations.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeader count={0} platform={platform} />
        <div className="rounded-lg border border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No automations synced yet. Run a sync to pull your scenarios.
        </div>
      </section>
    );
  }

  const issuesByName = groupIssuesByAutomationName(issues);
  const linkLabel = platform === "make" ? "Make" : "n8n";

  return (
    <section className="space-y-3">
      <SectionHeader count={automations.length} platform={platform} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {automations.map((a) => {
          const autoIssues = issuesByName.get(a.name) ?? [];
          const dot = computeHealthDot(a, autoIssues);
          const scenarioUrl = connection
            ? buildScenarioUrl(connection, a.externalId)
            : undefined;

          return (
            <div
              key={a.id}
              className="group rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <HealthDotBadge dot={dot} />
                  <span className="truncate text-sm font-semibold">
                    {a.name}
                  </span>
                </div>
                {scenarioUrl && (
                  <a
                    href={scenarioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${a.name} in ${linkLabel}`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {linkLabel}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <ShapeThumbnail status={a.status} />

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {formatFreshness(a)}
                </span>
                {autoIssues.length > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${issueBadgeClass(dot)}`}
                  >
                    {autoIssues.length}{" "}
                    {autoIssues.length === 1 ? "issue" : "issues"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({
  count,
  platform,
}: {
  count: number;
  platform: Platform;
}) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Automations
      </h3>
      <span className="text-[10px] tabular-nums text-muted-foreground/70">
        · {count} · {getPlatformLabel(platform)}
      </span>
    </div>
  );
}

function HealthDotBadge({ dot }: { dot: HealthDot }) {
  const color =
    dot === "red"
      ? "bg-red-500"
      : dot === "amber"
        ? "bg-yellow-500"
        : "bg-emerald-500";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
      aria-hidden
    />
  );
}

function ShapeThumbnail({ status }: { status: string }) {
  const active = status === "active";
  const dotClass = active ? "bg-muted-foreground/70" : "bg-muted-foreground/25";
  return (
    <div
      className="mt-3 flex items-center gap-1.5"
      aria-label="Scenario shape (module structure not available)"
      title="Scenario structure not available — upgrade to v2 for per-module detail"
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="h-px flex-1 bg-muted-foreground/15" />
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="h-px flex-1 bg-muted-foreground/15" />
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="h-px flex-1 bg-muted-foreground/15" />
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
    </div>
  );
}

function groupIssuesByAutomationName(
  issues: AutomationIssue[]
): Map<string, AutomationIssue[]> {
  const map = new Map<string, AutomationIssue[]>();
  for (const issue of issues) {
    if (issue.automationName === "Platform Connection") continue;
    const list = map.get(issue.automationName) ?? [];
    list.push(issue);
    map.set(issue.automationName, list);
  }
  return map;
}

function issueBadgeClass(dot: HealthDot): string {
  if (dot === "red") return "bg-red-500/15 text-red-400";
  if (dot === "amber") return "bg-yellow-500/15 text-yellow-400";
  return "bg-muted text-muted-foreground";
}

function formatFreshness(a: AutomationTile): string {
  const runsPart =
    a.totalRuns === 0
      ? "never run"
      : `${a.totalRuns} run${a.totalRuns === 1 ? "" : "s"}`;
  const lastPart = a.lastRunAt ? formatRelative(a.lastRunAt) : "no runs";
  return `${a.status} · ${runsPart} · ${lastPart}`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 8) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  return `${mo}mo ago`;
}
