"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import type { AutomationIssue, Platform } from "@/lib/types";
import { getDetector } from "@/lib/detectors";
import {
  groupByDetector,
  type DetectorGroup,
} from "@/lib/dashboard/derivations";
import { Button } from "@/components/ui/button";

interface IssuesByDetectorProps {
  issues: AutomationIssue[];
  platform: Platform;
}

export function IssuesByDetector({ issues, platform }: IssuesByDetectorProps) {
  const groups = groupByDetector(issues);
  const totalOpen = issues.length;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Issues grouped by detector</h2>
        {totalOpen > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalOpen} open · across{" "}
            {countAffectedAutomations(issues)}{" "}
            {countAffectedAutomations(issues) === 1
              ? "automation"
              : "automations"}
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          No issues detected.
        </div>
      ) : (
        groups.map((group) => (
          <DetectorGroupCard
            key={group.kind === "detector" ? group.type : "other"}
            group={group}
            platform={platform}
          />
        ))
      )}
    </section>
  );
}

function DetectorGroupCard({
  group,
  platform,
}: {
  group: DetectorGroup;
  platform: Platform;
}) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);

  const meta =
    group.kind === "detector"
      ? getDetector(group.type)
      : { label: "Other findings", shortLabel: "Other", description: "" };

  const worstSeverity = pickWorstSeverity(group.issues);
  const severityClasses = severityAccent(worstSeverity);

  const linkLabel = platform === "make" ? "Make" : "n8n";

  async function handleDismissAll() {
    setDismissing(true);
    setDismissError(null);
    try {
      const res = await fetch("/api/issues/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueIds: group.issues.map((i) => i.id) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to dismiss");
      }
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to dismiss";
      setDismissError(message);
    } finally {
      setDismissing(false);
    }
  }

  const affectedCount = group.issues.length;

  return (
    <div
      className={`rounded-xl border bg-card/50 ${severityClasses.border}`}
    >
      <div className="flex items-start gap-3 p-4">
        <SeverityIcon severity={worstSeverity} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold">{meta.label}</h3>
            <span className="text-xs text-muted-foreground">
              · {affectedCount} affected
            </span>
          </div>
          {meta.description && (
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {meta.description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={dismissing}
            onClick={handleDismissAll}
            className="text-xs"
          >
            {dismissing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Check className="mr-1 h-3 w-3" />
            )}
            Mark as intentional
          </Button>
        </div>
      </div>

      {dismissError && (
        <p className="px-4 pb-2 text-xs text-red-500">{dismissError}</p>
      )}

      <div className="border-t border-border/60">
        {group.issues.map((issue, idx) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            linkLabel={linkLabel}
            showDivider={idx > 0}
          />
        ))}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  linkLabel,
  showDivider,
}: {
  issue: AutomationIssue;
  linkLabel: string;
  showDivider: boolean;
}) {
  return (
    <details className={`group ${showDivider ? "border-t border-border/40" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/20">
        <div className="flex min-w-0 items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          <span className="truncate font-medium">{issue.automationName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {issue.scenarioUrl && (
            <a
              href={issue.scenarioUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {linkLabel}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </summary>
      <div className="space-y-2 px-4 pb-4 pl-10 text-sm">
        <p className="text-muted-foreground leading-relaxed">
          {issue.businessImpact}
        </p>
        <p className="text-foreground/90 leading-relaxed">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-2">
            Recommendation
          </span>
          {issue.recommendation}
        </p>
      </div>
    </details>
  );
}

function SeverityIcon({ severity }: { severity: "critical" | "warning" | "info" }) {
  const accent = severityAccent(severity);
  if (severity === "critical") {
    return <AlertTriangle className={`h-4 w-4 shrink-0 ${accent.icon}`} />;
  }
  if (severity === "warning") {
    return <AlertCircle className={`h-4 w-4 shrink-0 ${accent.icon}`} />;
  }
  return <AlertCircle className={`h-4 w-4 shrink-0 ${accent.icon}`} />;
}

function severityAccent(severity: "critical" | "warning" | "info") {
  if (severity === "critical") {
    return { border: "border-red-500/30", icon: "text-red-500" };
  }
  if (severity === "warning") {
    return { border: "border-yellow-500/30", icon: "text-yellow-500" };
  }
  return { border: "border-border/60", icon: "text-blue-500" };
}

function pickWorstSeverity(
  issues: AutomationIssue[]
): "critical" | "warning" | "info" {
  const order = { critical: 3, warning: 2, info: 1 } as const;
  let worst: "critical" | "warning" | "info" = "info";
  for (const issue of issues) {
    if (order[issue.severity] > order[worst]) worst = issue.severity;
  }
  return worst;
}

function countAffectedAutomations(issues: AutomationIssue[]): number {
  const set = new Set<string>();
  for (const issue of issues) set.add(issue.automationName);
  return set.size;
}
