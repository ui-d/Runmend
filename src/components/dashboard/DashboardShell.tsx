"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AutomationProfile, getHealthStatus } from "@/lib/types";
import { useDiagnostic } from "@/hooks/useDiagnostic";
import { useSync } from "@/hooks/useSync";
import { ProfileHeader } from "./ProfileHeader";
import { HealthHero } from "./HealthHero";
import { DetectorStrip } from "./DetectorStrip";
import {
  AutomationTileGrid,
  type AutomationTile,
} from "./AutomationTileGrid";
import { IssuesByDetector } from "./IssuesByDetector";
import { DiagnosticNarrative } from "./DiagnosticNarrative";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, Sparkles, ChevronDown } from "lucide-react";
import type { ConnectionUrlContext } from "@/lib/platform-adapters/urls";

interface DashboardShellProps {
  profile: AutomationProfile;
  hasConnection?: boolean;
  lastSyncedAt?: string | null;
  isAuthenticatedView?: boolean;
  diagnosticsHistoryUrl?: string;
  scheduleActive?: boolean;
  backHref?: string;
  backLabel?: string;
  automations?: AutomationTile[];
  connectionContext?: ConnectionUrlContext | null;
}

export function DashboardShell({
  profile,
  hasConnection,
  lastSyncedAt,
  isAuthenticatedView,
  diagnosticsHistoryUrl,
  scheduleActive,
  backHref,
  backLabel,
  automations,
  connectionContext,
}: DashboardShellProps) {
  const { narrative, isLoading, error, retry } = useDiagnostic(profile.id);
  const { sync, isSyncing, error: syncError } = useSync(profile.id);
  const [scheduleEnabled, setScheduleEnabled] = useState(scheduleActive ?? false);
  const [togglingSchedule, setTogglingSchedule] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const router = useRouter();

  async function handleSync() {
    const result = await sync();
    if (result) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3500);
      router.refresh();
    }
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

  const toolbar = showSyncButton ? (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
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
      {syncError ? (
        <p
          role="alert"
          className="text-xs text-red-500"
        >
          Sync failed: {syncError}
        </p>
      ) : null}
      {syncSuccess ? (
        <p className="text-xs text-emerald-500">Sync complete</p>
      ) : null}
    </div>
  ) : null;

  const showAutomationGrid = (automations?.length ?? 0) > 0;
  const healthStatus = getHealthStatus(profile.healthScore);

  return (
    <div className="min-h-screen">
      {!isAuthenticatedView && (
        <header className="border-b border-border/50 px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight">
              run<span className="text-muted-foreground">mend</span>
            </span>
          </div>
        </header>
      )}

      <main
        className={`${isAuthenticatedView ? "" : "max-w-6xl mx-auto px-4"} py-8 space-y-6`}
      >
        <ProfileHeader
          profile={profile}
          lastSyncedAt={lastSyncedAt}
          hideBackLink={isAuthenticatedView && !backHref}
          backHref={backHref}
          backLabel={backLabel}
          rightSlot={toolbar}
        />

        <HealthHero score={profile.healthScore} issues={profile.issues} />

        <DetectorStrip issues={profile.issues} />

        {showAutomationGrid && (
          <AutomationTileGrid
            automations={automations ?? []}
            issues={profile.issues}
            platform={profile.platform}
            connection={connectionContext ?? null}
          />
        )}

        <IssuesByDetector
          issues={profile.issues}
          platform={profile.platform}
        />

        <details
          className="group rounded-xl border border-border/60 bg-card/40"
          onToggle={(e) => setAiOpen((e.target as HTMLDetailsElement).open)}
          open={aiOpen}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">AI analysis</span>
              <span className="text-xs text-muted-foreground">
                — Claude&apos;s independent take on this profile
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border/60 p-4">
            <DiagnosticNarrative
              narrative={narrative}
              isLoading={isLoading}
              error={error}
              onRetry={retry}
              historyUrl={diagnosticsHistoryUrl}
              healthStatus={healthStatus}
            />
          </div>
        </details>
      </main>

      {!isAuthenticatedView && (
        <footer className="border-t border-border/50 py-8 mt-12 text-center text-sm text-muted-foreground">
          <p>
            Runmend — Automation health monitoring for Make.com &amp; n8n
          </p>
        </footer>
      )}
    </div>
  );
}
