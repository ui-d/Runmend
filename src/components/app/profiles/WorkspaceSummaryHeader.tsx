import type { WorkspacePulse } from "@/lib/queries/workspace-dashboard";
import {
  healthSeverity,
  healthSeverityClasses,
} from "@/lib/dashboard/derivations";
import { DeltaChip } from "@/components/app/dashboard/DeltaChip";
import { formatRelative } from "@/lib/time";

interface WorkspaceSummaryHeaderProps {
  pulse: WorkspacePulse;
  totalCriticalIssues: number;
  totalWarningIssues: number;
  totalInfoIssues: number;
}

/**
 * "Shape of the workspace" line for the page header. Replaces the thin
 * "1 profile · 2 issues" so a triage operator can answer "do I have to
 * worry?" without scanning the table.
 */
export function WorkspaceSummaryHeader({
  pulse,
  totalCriticalIssues,
  totalWarningIssues,
  totalInfoIssues,
}: WorkspaceSummaryHeaderProps) {
  const sev = healthSeverityClasses(healthSeverity(pulse.currentScore));
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="tabular-nums">
        <span className="text-foreground">{pulse.totalProfiles}</span> profile
        {pulse.totalProfiles === 1 ? "" : "s"}
      </span>
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        avg{" "}
        <span className={`font-semibold tabular-nums ${sev.text}`}>
          {pulse.currentScore}
        </span>
        <DeltaChip delta={pulse.delta30d} />
      </span>
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <span className="inline-flex items-baseline gap-1 tabular-nums">
        {totalCriticalIssues > 0 && (
          <span className="text-red-500">{totalCriticalIssues} crit</span>
        )}
        {totalCriticalIssues > 0 && totalWarningIssues > 0 && (
          <span className="text-muted-foreground/40">·</span>
        )}
        {totalWarningIssues > 0 && (
          <span className="text-yellow-500">{totalWarningIssues} warn</span>
        )}
        {totalInfoIssues > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-sky-400">{totalInfoIssues} info</span>
          </>
        )}
        {pulse.totalOpenIssues === 0 && <span>no open issues</span>}
      </span>
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <span className="tabular-nums">
        last sync{" "}
        <span className="text-foreground">
          {pulse.lastSyncAt ? formatRelative(pulse.lastSyncAt) : "never"}
        </span>
      </span>
    </p>
  );
}
