import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AutomationProfile } from "@/lib/types";

interface ProfileHeaderProps {
  profile: AutomationProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profiles
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {profile.name}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className="text-xs uppercase tracking-wider">
            {profile.platform === "zapier" ? "Zapier" : "Make.com"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {profile.scenarioCount} automations
          </span>
          <span className="text-sm text-muted-foreground">
            {profile.industry}
          </span>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Last audit: {new Date(profile.lastAuditDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
