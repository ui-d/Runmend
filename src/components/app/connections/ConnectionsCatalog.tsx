"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  CONNECTED_PLATFORMS,
  isLiveSlug,
} from "@/lib/connections/catalog";
import type { ConnectionHealth } from "@/lib/queries/connections";
import { ConnectionHealthCard } from "./ConnectionHealthCard";
import { ConnectorLogo } from "./ConnectorLogo";
import { AddConnectionDialog } from "./AddConnectionDialog";
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
  | {
      kind: "add";
      presetPlatform: "make" | "n8n" | null;
      defaultDisplayName: string;
      allowRenameAccount: boolean;
    };

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

  function handleAddConnection() {
    setDialog({
      kind: "add",
      presetPlatform: null,
      defaultDisplayName: "Primary",
      allowRenameAccount: false,
    });
  }

  function handleAddAnother(slug: string) {
    if (!isLiveSlug(slug)) return;
    const existing = connectedByPlatform.get(slug) ?? [];
    setDialog({
      kind: "add",
      presetPlatform: slug,
      defaultDisplayName: suggestNextName(existing),
      allowRenameAccount: true,
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

      <AddConnectionDialog
        open={dialog.kind === "add"}
        onOpenChange={(open) => !open && setDialog({ kind: "none" })}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        presetPlatform={dialog.kind === "add" ? dialog.presetPlatform : null}
        defaultDisplayName={
          dialog.kind === "add" ? dialog.defaultDisplayName : "Primary"
        }
        allowRenameAccount={
          dialog.kind === "add" ? dialog.allowRenameAccount : false
        }
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

function suggestNextName(existing: ConnectionHealth[]): string {
  const names = new Set(existing.map((c) => c.display_name));
  for (let i = 2; i < 100; i += 1) {
    const candidate = `Account ${i}`;
    if (!names.has(candidate)) return candidate;
  }
  return `Account ${existing.length + 1}`;
}
