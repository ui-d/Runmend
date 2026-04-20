import Link from "next/link";
import { Activity, AlertTriangle, Clock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { WorkspacePulse as PulseData } from "@/lib/queries/workspace-dashboard";
import { getHealthLabel, getHealthStatus } from "@/lib/types";
import { healthSeverity, healthSeverityClasses, sparklinePath } from "@/lib/dashboard/derivations";
import { formatRelative } from "@/lib/time";

interface WorkspacePulseProps {
  pulse: PulseData;
  workspaceSlug: string;
  hasAnyProfiles: boolean;
}

const SPARKLINE_WIDTH = 520;
const SPARKLINE_HEIGHT = 120;

export function WorkspacePulse({ pulse, workspaceSlug, hasAnyProfiles }: WorkspacePulseProps) {
  if (!hasAnyProfiles) {
    return <EmptyPulse />;
  }

  const severity = healthSeverity(pulse.currentScore);
  const sev = healthSeverityClasses(severity);
  const status = getHealthStatus(pulse.currentScore);
  const narrative = buildNarrative(pulse);
  const geometry = sparklinePath(pulse.trend, SPARKLINE_WIDTH, SPARKLINE_HEIGHT, 6);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:items-center">
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace pulse
          </span>
          <div className="flex items-baseline gap-3">
            <span className={`text-[72px] font-bold leading-none tabular-nums ${sev.text}`}>
              {pulse.currentScore}
            </span>
            <span className="text-lg font-medium text-muted-foreground/70">/100</span>
            <DeltaPill delta={pulse.delta30d} />
          </div>
          <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${sev.text}`}>
            {getHealthLabel(status)}
          </span>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{narrative}</p>
          {pulse.worstProfile && pulse.worstProfile.score < pulse.currentScore && (
            <Link
              href={`/app/${workspaceSlug}/profiles/${pulse.worstProfile.id}`}
              className="group inline-flex max-w-fit items-center gap-2 rounded-md border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              <span>
                Worst profile:{" "}
                <span className="font-medium text-foreground">{pulse.worstProfile.name}</span>
              </span>
              <span className={`font-semibold tabular-nums ${healthSeverityClasses(healthSeverity(pulse.worstProfile.score)).text}`}>
                {pulse.worstProfile.score}
              </span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <TrendChart geometry={geometry} severity={severity} trackingSince={pulse.trackingSince} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCell label="Profiles" value={pulse.totalProfiles} />
            <MetricCell label="Automations" value={pulse.totalAutomations} />
            <MetricCell
              label="Open issues"
              value={pulse.totalOpenIssues}
              accent={pulse.totalOpenIssues > 0 ? "warn" : "mute"}
            />
            <MetricCell
              label="Critical"
              value={pulse.totalCriticalIssues}
              accent={pulse.totalCriticalIssues > 0 ? "bad" : "mute"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Last sync{" "}
              <span className="text-foreground">
                {pulse.lastSyncAt ? formatRelative(pulse.lastSyncAt) : "never"}
              </span>
            </span>
            {pulse.nextSyncAt && (
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Next scheduled{" "}
                <span className="text-foreground">{formatRelative(pulse.nextSyncAt)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendChart({
  geometry,
  severity,
  trackingSince,
}: {
  geometry: ReturnType<typeof sparklinePath>;
  severity: ReturnType<typeof healthSeverity>;
  trackingSince: string | null;
}) {
  const stroke = healthSeverityClasses(severity).stroke;

  if (geometry.points.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center"
        style={{ height: SPARKLINE_HEIGHT }}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          30-day trend
        </span>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracking since {trackingSince ? formatAbsolute(trackingSince) : "today"} — trend appears after more syncs.
        </p>
      </div>
    );
  }

  const firstX = geometry.points[0].x;
  const lastX = geometry.points[geometry.points.length - 1].x;

  return (
    <div className="relative rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          30-day trend
        </span>
        {trackingSince && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            since {formatAbsolute(trackingSince)}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        className="h-[120px] w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="pulse-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className={stroke} stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="100%" className={stroke} stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={firstX}
            y1={SPARKLINE_HEIGHT * t}
            x2={lastX}
            y2={SPARKLINE_HEIGHT * t}
            className="stroke-border/40"
            strokeDasharray="2 4"
            strokeWidth={1}
          />
        ))}
        <path
          d={geometry.areaD}
          fill="url(#pulse-area)"
          className={stroke}
          stroke="none"
        />
        <path
          d={geometry.pathD}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${stroke} stroke-current`}
        />
        {geometry.lastPoint && (
          <circle
            cx={geometry.lastPoint.x}
            cy={geometry.lastPoint.y}
            r={3.5}
            className={`${stroke} fill-current`}
          />
        )}
      </svg>
    </div>
  );
}

function DeltaPill({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        Flat
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        positive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {delta} pts · 30d
    </span>
  );
}

function MetricCell({
  label,
  value,
  accent = "mute",
}: {
  label: string;
  value: number;
  accent?: "mute" | "warn" | "bad";
}) {
  const tone =
    accent === "bad"
      ? "text-red-500"
      : accent === "warn"
        ? "text-yellow-500"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <p className={`text-xl font-semibold tabular-nums leading-tight ${tone}`}>{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function buildNarrative(pulse: PulseData): string {
  const { delta30d, totalCriticalIssues, totalOpenIssues, worstProfile, currentScore } = pulse;
  const parts: string[] = [];

  if (delta30d !== null && delta30d !== 0) {
    parts.push(
      delta30d > 0
        ? `Up ${delta30d} pts in 30 days.`
        : `Down ${Math.abs(delta30d)} pts in 30 days.`,
    );
  } else if (delta30d === 0) {
    parts.push("Flat over 30 days.");
  }

  if (totalCriticalIssues > 0) {
    parts.push(
      `${totalCriticalIssues} critical issue${totalCriticalIssues === 1 ? "" : "s"} need attention.`,
    );
  } else if (totalOpenIssues > 0) {
    parts.push(
      `${totalOpenIssues} open issue${totalOpenIssues === 1 ? "" : "s"} but nothing critical.`,
    );
  } else if (currentScore >= 70) {
    parts.push("No open issues across the 6 detectors.");
  }

  if (worstProfile && worstProfile.score < 70 && totalCriticalIssues === 0) {
    parts.push(`${worstProfile.name} is the weakest link.`);
  }

  if (parts.length === 0) {
    return "Everything is steady.";
  }
  return parts.join(" ");
}

function EmptyPulse() {
  return (
    <section className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Workspace pulse
      </span>
      <h2 className="mt-2 text-xl font-semibold">Nothing to monitor yet.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Connect a platform and create your first profile — the pulse will start tracking once a sync completes.
      </p>
    </section>
  );
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
