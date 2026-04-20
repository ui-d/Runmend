import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { WorkspaceProfileCardData } from "@/lib/queries/workspace-dashboard";
import { getPlatformLabel } from "@/lib/types";
import { DETECTORS } from "@/lib/detectors";
import {
  healthSeverity,
  healthSeverityClasses,
  sparklinePath,
} from "@/lib/dashboard/derivations";
import { formatRelative } from "@/lib/time";
import { DeltaChip } from "@/components/app/dashboard/DeltaChip";

interface ProfilePulseCardProps {
  profile: WorkspaceProfileCardData;
  workspaceSlug: string;
}

const SPARKLINE_WIDTH = 160;
const SPARKLINE_HEIGHT = 36;

export function ProfilePulseCard({ profile, workspaceSlug }: ProfilePulseCardProps) {
  const severity = healthSeverity(profile.healthScore);
  const sev = healthSeverityClasses(severity);
  const geometry = sparklinePath(profile.sparkline, SPARKLINE_WIDTH, SPARKLINE_HEIGHT, 2);
  const href = `/app/${workspaceSlug}/profiles/${profile.id}`;
  const detectorLabels = new Map(DETECTORS.map((d) => [d.type, d.shortLabel]));

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 transition-colors hover:border-foreground/20">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${sev.bg}`}
        aria-hidden
      />
      <Link href={href} className="block px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold leading-tight text-foreground">
              {profile.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {getPlatformLabel(profile.platform)}
              {profile.industry ? ` · ${profile.industry}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-3xl font-bold tabular-nums leading-none ${sev.text}`}>
              {profile.healthScore}
            </span>
            <span className="mt-1">
              <DeltaChip delta={profile.sparklineDelta} />
            </span>
          </div>
        </div>

        <div className="mt-3">
          <Sparkline geometry={geometry} severity={severity} />
        </div>

        {profile.openIssueTypes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {profile.openIssueTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400"
              >
                {detectorLabels.get(type) ?? type}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/30 px-5 py-2.5 text-[11px] text-muted-foreground">
        <span className="truncate">
          <span className="text-foreground">{profile.automationCount}</span> automation
          {profile.automationCount === 1 ? "" : "s"} ·{" "}
          {profile.lastSyncedAt ? (
            <>
              synced <span className="text-foreground">{formatRelative(profile.lastSyncedAt)}</span>
            </>
          ) : (
            "never synced"
          )}
        </span>
        {profile.platformUrl && (
          <a
            href={profile.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-foreground/40"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function Sparkline({
  geometry,
  severity,
}: {
  geometry: ReturnType<typeof sparklinePath>;
  severity: ReturnType<typeof healthSeverity>;
}) {
  const stroke = healthSeverityClasses(severity).stroke;

  if (geometry.points.length === 0) {
    return (
      <div
        className="flex w-full items-center text-[10px] text-muted-foreground/70"
        style={{ height: SPARKLINE_HEIGHT }}
      >
        Tracking just started
      </div>
    );
  }

  if (geometry.points.length === 1) {
    return (
      <div
        className="flex w-full items-center justify-center text-[10px] text-muted-foreground/70"
        style={{ height: SPARKLINE_HEIGHT }}
      >
        Trend builds after more syncs
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      className="h-[36px] w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={geometry.pathD}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${stroke} stroke-current`}
      />
      {geometry.lastPoint && (
        <circle
          cx={geometry.lastPoint.x}
          cy={geometry.lastPoint.y}
          r={2}
          className={`${stroke} fill-current`}
        />
      )}
    </svg>
  );
}

