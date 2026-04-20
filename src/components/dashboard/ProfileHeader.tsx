import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AutomationProfile,
  getPlatformLabel,
  getHealthStatus,
  getHealthColorClasses,
  getHealthLabel,
} from "@/lib/types";

interface ProfileHeaderProps {
  profile: AutomationProfile;
  lastSyncedAt?: string | null;
  hideBackLink?: boolean;
  backHref?: string;
  backLabel?: string;
  rightSlot?: React.ReactNode;
}

export function ProfileHeader({
  profile,
  lastSyncedAt,
  hideBackLink,
  backHref = "/",
  backLabel = "Back to profiles",
  rightSlot,
}: ProfileHeaderProps) {
  const status = getHealthStatus(profile.healthScore);
  const healthColors = getHealthColorClasses(status);

  const metadata: string[] = [
    `${profile.scenarioCount} ${profile.scenarioCount === 1 ? "automation" : "automations"}`,
  ];
  if (profile.industry) metadata.push(profile.industry);
  metadata.push(`Audited ${formatDate(profile.lastAuditDate)}`);
  if (lastSyncedAt) metadata.push(`Synced ${formatDateTime(lastSyncedAt)}`);

  return (
    <div className="space-y-3">
      {!hideBackLink && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {profile.name}
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em]">
              {getPlatformLabel(profile.platform)}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full border ${healthColors.border}/40 ${healthColors.text} bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]`}
            >
              {getHealthLabel(status)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {metadata.map((item, i) => (
              <span key={item}>
                {i > 0 && <span className="mx-2 text-muted-foreground/40">·</span>}
                {item}
              </span>
            ))}
          </p>
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
