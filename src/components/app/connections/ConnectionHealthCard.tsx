"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Unplug, Plus, CheckCircle, AlertCircle } from "lucide-react";
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
  onAddAccount: () => void;
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
  onAddAccount,
}: ConnectionHealthCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    startTransition(async () => {
      const result = await syncConnectionAction(connection.id);
      if (!result.ok) setActionError(result.error ?? "Sync failed");
      router.refresh();
    });
  }

  async function handleTest() {
    setActionError(null);
    setTesting(true);
    try {
      const res = await fetch(`/api/connections/${connection.id}/test`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Test failed");
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(`Disconnect ${platformLabel} · ${connection.display_name}?`)) return;
    setActionError(null);
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/connections/${connection.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <ConnectorLogo slug={connection.platform} size={36} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">
                {platformLabel} · {connection.display_name}
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

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-border/60 px-5 py-4 sm:grid-cols-4">
        <Metric
          label={connection.platform === "n8n" ? "Workflows" : "Scenarios"}
          value={connection.automationCount}
          hint={
            connection.profileCount > 0
              ? `used by ${connection.profileCount} profile${connection.profileCount === 1 ? "" : "s"}`
              : "no profiles yet"
          }
        />
        <Metric
          label="24h syncs"
          value={connection.executions24h}
          hint={connection.executions24hFailed > 0 ? `${connection.executions24hFailed} failed` : "all green"}
        />
        <Metric
          label="Error rate 24h"
          value={`${failedPct}%`}
          valueClass={failedTone}
          hint={connection.failureRate24h === null ? "no activity" : "of executions"}
        />
        <Metric
          label="Next sync"
          value={formatNextSync(connection.nextSyncAt)}
          hint={`every ${15}m`}
        />
      </div>

      <div className="px-5 py-3">
        <ConnectionSyncSparkline buckets={connection.sparkline24h} />
      </div>

      {connection.status === "error" && connection.error_message && (
        <div className="border-t border-red-500/30 bg-red-500/5 px-5 py-3 text-xs text-red-300">
          <p className="font-medium">Last sync failed</p>
          <p className="mt-0.5 text-red-300/80">{connection.error_message}</p>
        </div>
      )}

      {actionError && (
        <div className="border-t border-red-500/30 bg-red-500/5 px-5 py-2 text-xs text-red-300">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/30 px-5 py-3 text-[11px] text-muted-foreground">
        <span className="truncate">
          Connected <span className="text-foreground">{formatRelative(connection.created_at)}</span>
          {" · last synced "}
          <span className="text-foreground">
            {connection.last_synced_at ? formatRelative(connection.last_synced_at) : "never"}
          </span>
          {connection.last_tested_at && (
            <>
              {" · tested "}
              <span className="text-foreground">
                {formatRelative(connection.last_tested_at)}
              </span>
            </>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSync} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Sync now
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle className="mr-1 h-3 w-3" />
            )}
            Test
          </Button>
          <Button size="sm" variant="outline" onClick={onAddAccount}>
            <Plus className="mr-1 h-3 w-3" />
            Add account
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-destructive hover:text-destructive"
          >
            {disconnecting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Unplug className="mr-1 h-3 w-3" />
            )}
            Disconnect
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
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}
