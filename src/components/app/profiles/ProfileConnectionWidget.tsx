"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Link2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectorLogo } from "@/components/app/connections/ConnectorLogo";
import { formatRelative } from "@/lib/time";

export interface ProfileConnectionSummary {
  id: string;
  display_name: string;
  platform: string;
  status: string;
  zone: string | null;
  instance_url: string | null;
  last_synced_at: string | null;
  error_message: string | null;
}

interface ProfileConnectionWidgetProps {
  profileId: string;
  profileName: string;
  workspaceSlug: string;
  connection: ProfileConnectionSummary | null;
  platformLabel: string;
  availableConnections: ProfileConnectionSummary[];
}

function statusCopy(status: string, errorMessage: string | null): {
  label: string;
  tone: "ok" | "warn" | "error";
  Icon: typeof CheckCircle;
} {
  if (status === "active") return { label: "Healthy", tone: "ok", Icon: CheckCircle };
  if (status === "pending") return { label: "Pending test", tone: "warn", Icon: AlertCircle };
  if (status === "expired") return { label: "Token expired", tone: "error", Icon: AlertCircle };
  if (status === "revoked") return { label: "Revoked", tone: "error", Icon: AlertCircle };
  if (status === "error") {
    const suffix = errorMessage ? ` · ${truncate(errorMessage, 40)}` : "";
    return { label: `Error${suffix}`, tone: "error", Icon: AlertCircle };
  }
  return { label: status, tone: "warn", Icon: AlertCircle };
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

export function ProfileConnectionWidget({
  profileId,
  profileName,
  workspaceSlug,
  connection,
  platformLabel,
  availableConnections,
}: ProfileConnectionWidgetProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const otherConnections = availableConnections.filter(
    (c) => c.id !== connection?.id,
  );

  async function handlePick(connectionId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to switch connection");
      toast.success(`${profileName} now monitors ${data.profile ? availableConnections.find((c) => c.id === connectionId)?.display_name ?? "the new connection" : "the new connection"}`);
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch connection");
    } finally {
      setSaving(false);
    }
  }

  if (!connection) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-5">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-muted-foreground" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              No connection bound
            </p>
            <p className="text-xs text-muted-foreground">
              This profile isn&apos;t monitoring any platform yet.
            </p>
          </div>
          {otherConnections.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              Bind connection
            </Button>
          ) : (
            <Link
              href={`/app/${workspaceSlug}/connections`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Add a {platformLabel} connection
            </Link>
          )}
        </div>
        <SwapDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          connections={otherConnections}
          currentId={null}
          onPick={handlePick}
          saving={saving}
          platformLabel={platformLabel}
        />
      </div>
    );
  }

  const status = statusCopy(connection.status, connection.error_message);
  const tone = toneClass(status.tone);
  const origin = connection.zone
    ? `${connection.zone}.make.com`
    : connection.instance_url ?? null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ConnectorLogo slug={connection.platform} size={32} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Monitoring via
            </p>
            <Link
              href={`/app/${workspaceSlug}/connections`}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {platformLabel} · {connection.display_name}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {origin ?? "API token"}
              {" · last synced "}
              {connection.last_synced_at
                ? formatRelative(connection.last_synced_at)
                : "never"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
          >
            <status.Icon className="h-3 w-3" aria-hidden />
            {status.label}
          </span>
          {otherConnections.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Change
            </Button>
          )}
        </div>
      </div>

      <SwapDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connections={otherConnections}
        currentId={connection.id}
        onPick={handlePick}
        saving={saving}
        platformLabel={platformLabel}
      />
    </div>
  );
}

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: ProfileConnectionSummary[];
  currentId: string | null;
  onPick: (id: string) => void;
  saving: boolean;
  platformLabel: string;
}

function SwapDialog({
  open,
  onOpenChange,
  connections,
  onPick,
  saving,
  platformLabel,
}: SwapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change connection</DialogTitle>
          <DialogDescription>
            Choose another {platformLabel} account in this workspace. The
            profile keeps its history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {connections.map((c) => {
            const status = statusCopy(c.status, c.error_message);
            return (
              <button
                key={c.id}
                type="button"
                disabled={saving}
                onClick={() => onPick(c.id)}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-left transition-colors hover:border-foreground/40 hover:bg-card/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ConnectorLogo slug={c.platform} size={24} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {c.display_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.zone ? `${c.zone}.make.com` : c.instance_url ?? "API token"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass(status.tone)}`}
                >
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
