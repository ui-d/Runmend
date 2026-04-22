"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Unplug, CheckCircle, AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { ConnectionHealth } from "@/lib/queries/connections";
import { ConnectorLogo } from "./ConnectorLogo";
import { ConnectionSyncSparkline } from "./ConnectionSyncSparkline";
import { FreshnessCell } from "@/components/app/profiles/FreshnessCell";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/time";
import { syncConnectionAction } from "@/app/app/[workspaceSlug]/connections/actions";

interface ConnectionHealthCardProps {
  connection: ConnectionHealth;
  platformLabel: string;
  workspaceSlug: string;
}

function statusCopy(status: string, errorMessage: string | null): {
  label: string;
  tone: "ok" | "warn" | "error";
} {
  if (status === "active") return { label: "Healthy", tone: "ok" };
  if (status === "pending") return { label: "Pending test", tone: "warn" };
  if (status === "expired") return { label: "Token expired", tone: "error" };
  if (status === "revoked") return { label: "Revoked", tone: "error" };
  if (status === "error")
    return { label: errorMessage ? `Error · ${truncate(errorMessage, 60)}` : "Error", tone: "error" };
  return { label: status, tone: "warn" };
}

function toneClass(tone: "ok" | "warn" | "error"): string {
  if (tone === "ok") return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (tone === "warn") return "text-yellow-400 border-yellow-500/40 bg-yellow-500/10";
  return "text-red-400 border-red-500/40 bg-red-500/10";
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}

function formatNextSync(iso: string | null): string {
  if (!iso) return "queued";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "due now";
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `in ${hours}h`;
}

export function ConnectionHealthCard({
  connection,
  platformLabel,
  workspaceSlug,
}: ConnectionHealthCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connectionLabel = `${platformLabel} · ${connection.display_name}`;

  const status = statusCopy(connection.status, connection.error_message);
  const tone = toneClass(status.tone);
  const sublineBits = [
    connection.auth_type === "api_key" ? "API token" : connection.auth_type,
    connection.zone ? `${connection.zone}.make.com` : null,
    connection.instance_url,
    "scope: read",
  ].filter(Boolean);

  const failedPct = connection.failureRate24h
    ? Math.round(connection.failureRate24h * 100)
    : 0;
  const failedTone =
    failedPct === 0
      ? "text-foreground"
      : failedPct < 10
        ? "text-yellow-400"
        : "text-red-400";

  function handleSync() {
    const toastId = toast.loading(`Syncing ${connectionLabel}…`);
    startTransition(async () => {
      const result = await syncConnectionAction(connection.id);
      if (!result.ok) {
        toast.error(result.error ?? "Sync failed", { id: toastId });
      } else {
        const count = result.profilesSynced ?? 0;
        toast.success(
          `Synced ${connectionLabel}${count > 0 ? ` · ${count} profile${count === 1 ? "" : "s"}` : ""}`,
          { id: toastId },
        );
      }
      router.refresh();
    });
  }

  async function handleTest() {
    setTesting(true);
    const toastId = toast.loading(`Testing ${connectionLabel}…`);
    try {
      const res = await fetch(`/api/connections/${connection.id}/test`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.ok === false) {
        throw new Error(body?.error ?? "Test failed");
      }
      toast.success(`${connectionLabel} is healthy`, { id: toastId });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed", { id: toastId });
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(`Disconnect ${connectionLabel}?`)) return;
    setDisconnecting(true);
    const toastId = toast.loading(`Disconnecting ${connectionLabel}…`);
    try {
      const res = await fetch(`/api/connections/${connection.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success(`${connectionLabel} disconnected`, { id: toastId });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed", { id: toastId });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-white/[0.02] transition-colors hover:border-border/80">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <ConnectorLogo slug={connection.platform} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {connection.display_name}
              </h3>
              <FreshnessCell
                freshness={connection.freshness}
                lastSyncedAt={connection.last_synced_at}
              />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {sublineBits.join(" · ")}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
        >
          {status.tone === "ok" ? (
            <CheckCircle className="h-3 w-3" aria-hidden />
          ) : (
            <AlertCircle className="h-3 w-3" aria-hidden />
          )}
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 bg-background/40 px-4 py-3 sm:grid-cols-4">
        <Metric
          label={connection.platform === "n8n" ? "Workflows" : "Scenarios"}
          value={connection.automationCount}
          hint={
            connection.profileCount > 0
              ? `${connection.profileCount} profile${connection.profileCount === 1 ? "" : "s"}`
              : "no profiles"
          }
        />
        <Metric
          label="24h syncs"
          value={connection.executions24h}
          hint={connection.executions24hFailed > 0 ? `${connection.executions24hFailed} failed` : "all green"}
        />
        <Metric
          label="Error rate"
          value={`${failedPct}%`}
          valueClass={failedTone}
          hint={connection.failureRate24h === null ? "no activity" : "last 24h"}
        />
        <Metric
          label="Next sync"
          value={formatNextSync(connection.nextSyncAt)}
          hint={`every 15m`}
        />
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-1.5 border-t border-border/60 px-4 py-2.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Profiles
        </span>
        {connection.linkedProfiles.length === 0 ? (
          <Link
            href={`/app/${workspaceSlug}/profiles/new?connectionId=${connection.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            <UserPlus className="h-3 w-3" aria-hidden />
            Add profile
          </Link>
        ) : (
          connection.linkedProfiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/app/${workspaceSlug}/profiles/${profile.id}`}
              className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground hover:border-foreground/60"
            >
              {profile.name}
            </Link>
          ))
        )}
      </div>

      <div className="border-t border-border/60 px-4 py-2.5">
        <ConnectionSyncSparkline buckets={connection.sparkline24h} />
      </div>

      {connection.status === "error" && connection.error_message && (
        <div className="border-t border-red-500/30 bg-red-500/5 px-4 py-2.5 text-xs text-red-300">
          <p className="font-medium">Last sync failed</p>
          <p className="mt-0.5 text-red-300/80">{connection.error_message}</p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-background/40 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="truncate">
          synced{" "}
          <span className="text-foreground">
            {connection.last_synced_at ? formatRelative(connection.last_synced_at) : "never"}
          </span>
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSync} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Sync
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleTest} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle className="mr-1 h-3 w-3" />
            )}
            Test
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Unplug className="mr-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string | number;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-base font-semibold tabular-nums ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}
