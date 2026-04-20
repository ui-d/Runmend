"use client";

import type { ComingSoonCatalogEntry } from "@/lib/connections/catalog";
import { ConnectorLogo } from "./ConnectorLogo";

interface ComingSoonTileProps {
  entry: ComingSoonCatalogEntry;
  voteCount: number;
  hasVoted: boolean;
  onToggle: (slug: ComingSoonCatalogEntry["slug"]) => void;
  pending?: boolean;
}

/**
 * Roadmap tile. Clicking "Notify me" toggles the user's vote optimistically;
 * the aggregated count next to it is the workspace-scoped demand signal we
 * use to prioritize the next connector to build.
 */
export function ComingSoonTile({
  entry,
  voteCount,
  hasVoted,
  onToggle,
  pending,
}: ComingSoonTileProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-3 transition-opacity">
      <div className="flex min-w-0 items-center gap-3">
        <ConnectorLogo slug={entry.slug} size={28} className="opacity-80" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{entry.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{entry.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(entry.slug)}
          disabled={pending}
          className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            hasVoted
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-border/60 bg-background/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          {hasVoted ? "✓ Notified" : "Notify me"}
        </button>
        <span
          className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground"
          aria-label={`${voteCount} votes`}
        >
          {voteCount} {voteCount === 1 ? "vote" : "votes"}
        </span>
      </div>
    </div>
  );
}
