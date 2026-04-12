"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AutomationProfile } from "@/lib/types";
import { useDiagnostic } from "@/hooks/useDiagnostic";
import { useSync } from "@/hooks/useSync";
import { ProfileHeader } from "./ProfileHeader";
import { HealthScore } from "./HealthScore";
import { IssuesList } from "./IssuesList";
import { DiagnosticNarrative } from "./DiagnosticNarrative";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock } from "lucide-react";

interface DashboardShellProps {
  profile: AutomationProfile;
  hasConnection?: boolean;
  lastSyncedAt?: string | null;
  isAuthenticatedView?: boolean;
  diagnosticsHistoryUrl?: string;
  scheduleActive?: boolean;
}

export function DashboardShell({
  profile,
  hasConnection,
  lastSyncedAt,
  isAuthenticatedView,
  diagnosticsHistoryUrl,
  scheduleActive,
}: DashboardShellProps) {
  const { narrative, isLoading, error, retry } = useDiagnostic(profile.id);
  const { sync, isSyncing } = useSync(profile.id);
  const [scheduleEnabled, setScheduleEnabled] = useState(scheduleActive ?? false);
  const [togglingSchedule, setTogglingSchedule] = useState(false);
  const router = useRouter();

  async function handleSync() {
    await sync();
    router.refresh();
  }

  async function handleToggleSchedule() {
    const newValue = !scheduleEnabled;
    setTogglingSchedule(true);
    try {
      if (scheduleEnabled) {
        await fetch(`/api/schedules/${profile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      } else {
        await fetch(`/api/schedules/${profile.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        });
      }
      setScheduleEnabled(newValue);
    } finally {
      setTogglingSchedule(false);
    }
  }

  const showSyncButton = isAuthenticatedView && hasConnection;

  return (
    <div className="min-h-screen">
      {!isAuthenticatedView && (
        <header className="border-b border-border/50 px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight">
              flow<span className="text-muted-foreground">check</span>
            </span>
          </div>
        </header>
      )}

      <main className={`${isAuthenticatedView ? "" : "max-w-6xl mx-auto px-4"} py-8 space-y-8`}>
        <div className="flex items-start justify-between gap-4">
          <ProfileHeader
            profile={profile}
            lastSyncedAt={lastSyncedAt}
            hideBackLink={isAuthenticatedView}
          />
          {showSyncButton && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleToggleSchedule}
                disabled={togglingSchedule}
                variant="ghost"
                size="sm"
                className={`text-xs ${scheduleEnabled ? "text-emerald-500" : "text-muted-foreground"}`}
              >
                <Clock className="mr-1 h-3 w-3" />
                {scheduleEnabled ? "Auto-sync on" : "Auto-sync off"}
              </Button>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HealthScore score={profile.healthScore} />
          <DiagnosticNarrative
            narrative={narrative}
            isLoading={isLoading}
            error={error}
            onRetry={retry}
            historyUrl={diagnosticsHistoryUrl}
          />
        </div>

        <IssuesList issues={profile.issues} />
      </main>

      {!isAuthenticatedView && (
        <footer className="border-t border-border/50 py-8 mt-12 text-center text-sm text-muted-foreground">
          <p>
            FlowCheck — Automation health monitoring for Make.com &amp; n8n
          </p>
        </footer>
      )}
    </div>
  );
}
