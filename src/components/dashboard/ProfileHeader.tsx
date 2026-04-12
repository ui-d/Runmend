import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AutomationProfile, getPlatformLabel } from "@/lib/types";

interface ProfileHeaderProps {
  profile: AutomationProfile;
  lastSyncedAt?: string | null;
  hideBackLink?: boolean;
}

export function ProfileHeader({ profile, lastSyncedAt, hideBackLink }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {!hideBackLink && (
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profiles
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {profile.name}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className="text-xs uppercase tracking-wider">
            {getPlatformLabel(profile.platform)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {profile.scenarioCount} automations
          </span>
          {profile.industry && (
            <span className="text-sm text-muted-foreground">
              {profile.industry}
            </span>
          )}
        </div>
      </div>
      <div className="text-right text-sm text-muted-foreground space-y-1">
        <p>
          Last audit:{" "}
          {new Date(profile.lastAuditDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {lastSyncedAt && (
          <p className="text-xs">
            Synced:{" "}
            {new Date(lastSyncedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
