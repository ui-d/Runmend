"use client";

import { AutomationProfile } from "@/lib/types";
import { useDiagnostic } from "@/hooks/useDiagnostic";
import { ProfileHeader } from "./ProfileHeader";
import { HealthScore } from "./HealthScore";
import { IssuesList } from "./IssuesList";
import { DiagnosticNarrative } from "./DiagnosticNarrative";

interface DashboardShellProps {
  profile: AutomationProfile;
}

export function DashboardShell({ profile }: DashboardShellProps) {
  const { narrative, isLoading, error, retry } = useDiagnostic(profile.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            flow<span className="text-muted-foreground">check</span>
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <ProfileHeader profile={profile} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HealthScore score={profile.healthScore} />
          <DiagnosticNarrative
            narrative={narrative}
            isLoading={isLoading}
            error={error}
            onRetry={retry}
          />
        </div>

        <IssuesList issues={profile.issues} />
      </main>

      <footer className="border-t border-border/50 py-8 mt-12 text-center text-sm text-muted-foreground">
        <p>
          FlowCheck — Automation health monitoring for Zapier &amp; Make.com
        </p>
      </footer>
    </div>
  );
}
