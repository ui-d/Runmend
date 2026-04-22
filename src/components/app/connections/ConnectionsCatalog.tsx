"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  CONNECTED_PLATFORMS,
  isLiveSlug,
  type CatalogSlug,
} from "@/lib/connections/catalog";
import type { ConnectionHealth } from "@/lib/queries/connections";
import { ConnectionHealthCard } from "./ConnectionHealthCard";
import { ConnectorLogo } from "./ConnectorLogo";
import { ConnectMakeDialog } from "@/components/app/ConnectMakeDialog";
import { ConnectN8nDialog } from "@/components/app/ConnectN8nDialog";
import { Button } from "@/components/ui/button";

interface ConnectionsCatalogProps {
  workspaceId: string;
  workspaceSlug: string;
  connections: ConnectionHealth[];
  voteCounts: Record<string, number>;
  userVotedSlugs: string[];
}

type DialogState =
  | { kind: "none" }
  | { kind: "picker" }
  | { kind: "make"; defaultDisplayName: string; allowRename: boolean }
  | { kind: "n8n"; defaultDisplayName: string; allowRename: boolean };

export function ConnectionsCatalog({
  workspaceId,
  workspaceSlug,
  connections,
}: ConnectionsCatalogProps) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const connectedByPlatform = useMemo(() => {
    const map = new Map<string, ConnectionHealth[]>();
    for (const conn of connections) {
      const list = map.get(conn.platform) ?? [];
      list.push(conn);
      map.set(conn.platform, list);
    }
    return map;
  }, [connections]);

  const platformLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of CONNECTED_PLATFORMS) map.set(entry.slug, entry.label);
    return map;
  }, []);

  const platformGroups = useMemo(() => {
    return CONNECTED_PLATFORMS.map((entry) => ({
      slug: entry.slug,
      label: entry.label,
      connections: connectedByPlatform.get(entry.slug) ?? [],
    })).filter((group) => group.connections.length > 0);
  }, [connectedByPlatform]);

  function openAuthDialog(
    slug: CatalogSlug,
    options: { defaultDisplayName: string; allowRename: boolean },
  ) {
    if (slug === "make") setDialog({ kind: "make", ...options });
    else if (slug === "n8n") setDialog({ kind: "n8n", ...options });
  }

  function handleAddAnother(slug: string) {
    if (!isLiveSlug(slug)) return;
    const existing = connectedByPlatform.get(slug) ?? [];
    openAuthDialog(slug, {
      defaultDisplayName: suggestNextName(existing),
      allowRename: true,
    });
  }

  function handleAddConnection() {
    setDialog({ kind: "picker" });
  }

  function handlePlatformPicked(slug: CatalogSlug) {
    if (!isLiveSlug(slug)) return;
    const existing = connectedByPlatform.get(slug) ?? [];
    openAuthDialog(slug, {
      defaultDisplayName:
        existing.length === 0 ? "Primary" : suggestNextName(existing),
      allowRename: existing.length > 0,
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platforms Runmend is monitoring. Sync runs every 15 minutes.
          </p>
        </div>
        <Button onClick={handleAddConnection}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add connection
        </Button>
      </header>

      {platformGroups.length === 0 ? (
        <EmptyState onAdd={handleAddConnection} />
      ) : (
        <div className="space-y-8">
          {platformGroups.map((group) => (
            <section key={group.slug} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ConnectorLogo slug={group.slug} size={20} />
                  <h2 className="text-sm font-semibold text-foreground">
                    {group.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    · {group.connections.length} account
                    {group.connections.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddAnother(group.slug)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  Add another
                </button>
              </div>
              <div className="space-y-3">
                {group.connections.map((conn) => (
                  <ConnectionHealthCard
                    key={conn.id}
                    connection={conn}
                    platformLabel={
                      platformLabelBySlug.get(conn.platform) ?? conn.platform
                    }
                    workspaceSlug={workspaceSlug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
        Looking for a platform we don&apos;t support yet?{" "}
        <Link
          href={`/app/${workspaceSlug}/roadmap`}
          className="font-medium text-foreground hover:underline"
        >
          See our roadmap →
        </Link>
      </footer>

      <PlatformPickerDialog
        open={dialog.kind === "picker"}
        onOpenChange={(open) => !open && setDialog({ kind: "none" })}
        onPick={handlePlatformPicked}
        workspaceSlug={workspaceSlug}
      />

      <ConnectMakeDialog
        open={dialog.kind === "make"}
        onOpenChange={(open) => !open && setDialog({ kind: "none" })}
        workspaceId={workspaceId}
        defaultDisplayName={
          dialog.kind === "make" ? dialog.defaultDisplayName : "Primary"
        }
        allowRenameAccount={dialog.kind === "make" ? dialog.allowRename : false}
      />
      <ConnectN8nDialog
        open={dialog.kind === "n8n"}
        onOpenChange={(open) => !open && setDialog({ kind: "none" })}
        workspaceId={workspaceId}
        defaultDisplayName={
          dialog.kind === "n8n" ? dialog.defaultDisplayName : "Primary"
        }
        allowRenameAccount={dialog.kind === "n8n" ? dialog.allowRename : false}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center">
      <h2 className="text-base font-semibold text-foreground">
        No connections yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Connect a Make.com or n8n account to start monitoring scenarios and
        workflows for silent failures.
      </p>
      <Button className="mt-4" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add connection
      </Button>
    </div>
  );
}

interface PlatformPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (slug: CatalogSlug) => void;
  workspaceSlug: string;
}

function PlatformPickerDialog({
  open,
  onOpenChange,
  onPick,
  workspaceSlug,
}: PlatformPickerDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-picker-title"
        className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="platform-picker-title"
          className="text-lg font-semibold text-foreground"
        >
          Choose a platform
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll walk you through authentication next.
        </p>
        <div className="mt-4 grid gap-2">
          {CONNECTED_PLATFORMS.map((entry) => (
            <button
              key={entry.slug}
              type="button"
              onClick={() => {
                onOpenChange(false);
                onPick(entry.slug);
              }}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-left transition-colors hover:border-foreground/40 hover:bg-card/70"
            >
              <ConnectorLogo slug={entry.slug} size={28} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {entry.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.authTypeLabel}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <Link
            href={`/app/${workspaceSlug}/roadmap`}
            className="hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Don&apos;t see yours? Request a platform →
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function suggestNextName(existing: ConnectionHealth[]): string {
  const names = new Set(existing.map((c) => c.display_name));
  for (let i = 2; i < 100; i += 1) {
    const candidate = `Account ${i}`;
    if (!names.has(candidate)) return candidate;
  }
  return `Account ${existing.length + 1}`;
}
