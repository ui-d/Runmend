"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AVAILABLE_CONNECTORS,
  COMING_SOON_CONNECTORS,
  CONNECTED_PLATFORMS,
  isLiveSlug,
  type CatalogSlug,
} from "@/lib/connections/catalog";
import type { ConnectionHealth } from "@/lib/queries/connections";
import { ConnectionHealthCard } from "./ConnectionHealthCard";
import { AvailableConnectorTile } from "./AvailableConnectorTile";
import { ComingSoonTile } from "./ComingSoonTile";
import { RequestConnectorInput } from "./RequestConnectorInput";
import { ConnectMakeDialog } from "@/components/app/ConnectMakeDialog";
import { ConnectN8nDialog } from "@/components/app/ConnectN8nDialog";
import { toggleInterestAction } from "@/app/app/[workspaceSlug]/connections/actions";

interface ConnectionsCatalogProps {
  workspaceId: string;
  connections: ConnectionHealth[];
  voteCounts: Record<string, number>;
  userVotedSlugs: string[];
}

type DialogState =
  | { kind: "none" }
  | { kind: "make"; defaultDisplayName: string; allowRename: boolean }
  | { kind: "n8n"; defaultDisplayName: string; allowRename: boolean };

export function ConnectionsCatalog({
  workspaceId,
  connections,
  voteCounts,
  userVotedSlugs,
}: ConnectionsCatalogProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [pending, startTransition] = useTransition();
  const [localVoteCounts, setLocalVoteCounts] = useState(voteCounts);
  const [localVoted, setLocalVoted] = useState(new Set(userVotedSlugs));
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

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
    for (const entry of AVAILABLE_CONNECTORS) map.set(entry.slug, entry.label);
    return map;
  }, []);

  const connectedCount = connections.length;

  function openConnectDialog(
    slug: CatalogSlug,
    options: { defaultDisplayName: string; allowRename: boolean }
  ) {
    if (slug === "make") {
      setDialog({ kind: "make", ...options });
    } else if (slug === "n8n") {
      setDialog({ kind: "n8n", ...options });
    }
  }

  function handleConnect(slug: CatalogSlug) {
    if (!isLiveSlug(slug)) return;
    const existing = connectedByPlatform.get(slug) ?? [];
    openConnectDialog(slug, {
      defaultDisplayName: existing.length === 0 ? "Primary" : suggestNextName(existing),
      allowRename: existing.length > 0,
    });
  }

  function handleAddAccount(slug: string) {
    if (!isLiveSlug(slug)) return;
    const existing = connectedByPlatform.get(slug) ?? [];
    openConnectDialog(slug, {
      defaultDisplayName: suggestNextName(existing),
      allowRename: true,
    });
  }

  function handleVoteToggle(slug: string) {
    setPendingSlug(slug);
    const wasVoted = localVoted.has(slug);
    const nextVoted = new Set(localVoted);
    if (wasVoted) nextVoted.delete(slug);
    else nextVoted.add(slug);
    setLocalVoted(nextVoted);
    setLocalVoteCounts((prev) => ({
      ...prev,
      [slug]: Math.max(0, (prev[slug] ?? 0) + (wasVoted ? -1 : 1)),
    }));

    startTransition(async () => {
      const result = await toggleInterestAction(workspaceId, slug);
      if (!result.ok) {
        // revert
        setLocalVoted(localVoted);
        setLocalVoteCounts(voteCounts);
      } else if (typeof result.count === "number") {
        setLocalVoteCounts((prev) => ({ ...prev, [slug]: result.count ?? 0 }));
      }
      setPendingSlug(null);
      router.refresh();
    });
  }

  const availableUnconnected = AVAILABLE_CONNECTORS.filter(
    (entry) =>
      !(connectedByPlatform.get(entry.slug)?.length ?? 0) || entry.comingSoon,
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeader
          title={`Connected · ${connectedCount}`}
          hint={
            connectedCount === 0
              ? "0 of 1 free-tier slots used"
              : `${connectedCount} of 1 free-tier slots used`
          }
        />
        {connectedCount === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-6 text-sm text-muted-foreground">
            No connections yet. Pick a platform below to start monitoring.
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <ConnectionHealthCard
                key={conn.id}
                connection={conn}
                platformLabel={
                  platformLabelBySlug.get(conn.platform) ?? conn.platform
                }
                onAddAccount={() => handleAddAccount(conn.platform)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={`Available · ${availableUnconnected.length}`}
          hint="Live integrations you can add now, plus upcoming ones you can vote for."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableUnconnected.map((entry) => (
            <AvailableConnectorTile
              key={entry.slug}
              entry={entry}
              onConnect={handleConnect}
              onNotifyMe={handleVoteToggle}
              voteCount={localVoteCounts[entry.slug] ?? 0}
              hasVoted={localVoted.has(entry.slug)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title={`Coming soon · ${COMING_SOON_CONNECTORS.length}`}
          hint="Tap Notify me on the platforms you want next. We ship what the most people vote for."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMING_SOON_CONNECTORS.map((entry) => (
            <ComingSoonTile
              key={entry.slug}
              entry={entry}
              voteCount={localVoteCounts[entry.slug] ?? 0}
              hasVoted={localVoted.has(entry.slug)}
              onToggle={handleVoteToggle}
              pending={pending && pendingSlug === entry.slug}
            />
          ))}
        </div>
      </section>

      <section>
        <RequestConnectorInput workspaceId={workspaceId} />
      </section>

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

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <p className="text-[11px] text-muted-foreground/80">{hint}</p>
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
