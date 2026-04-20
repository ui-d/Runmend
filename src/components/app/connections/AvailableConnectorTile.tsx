"use client";

import { ArrowUpRight, Lock } from "lucide-react";
import type { AvailableCatalogEntry } from "@/lib/connections/catalog";
import { ConnectorLogo } from "./ConnectorLogo";
import { Button } from "@/components/ui/button";

interface AvailableConnectorTileProps {
  entry: AvailableCatalogEntry;
  onConnect: (slug: AvailableCatalogEntry["slug"]) => void;
  onNotifyMe?: (slug: AvailableCatalogEntry["slug"]) => void;
  voteCount?: number;
  hasVoted?: boolean;
}

/**
 * Compact grid tile for a connectable (or soon-connectable) platform. Live
 * integrations expose a Connect button; coming-soon ones swap to
 * "Notify me" with a vote count so the roadmap doubles as a demand signal.
 */
export function AvailableConnectorTile({
  entry,
  onConnect,
  onNotifyMe,
  voteCount = 0,
  hasVoted = false,
}: AvailableConnectorTileProps) {
  const isLive = !entry.comingSoon;

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ConnectorLogo slug={entry.slug} size={28} />
            <div>
              <p className="text-sm font-semibold text-foreground">{entry.label}</p>
              <p className="text-[11px] text-muted-foreground">{entry.authTypeLabel}</p>
            </div>
          </div>
          {!isLive && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              Beta waitlist
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{entry.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {isLive ? (
          <Button size="sm" onClick={() => onConnect(entry.slug)} className="h-8">
            Connect
          </Button>
        ) : (
          <Button
            size="sm"
            variant={hasVoted ? "secondary" : "outline"}
            onClick={() => onNotifyMe?.(entry.slug)}
            className="h-8"
          >
            {hasVoted ? "✓ You'll be notified" : "Notify me"}
            {voteCount > 0 && (
              <span className="ml-2 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                {voteCount}
              </span>
            )}
          </Button>
        )}
        {entry.docsUrl && (
          <a
            href={entry.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            Docs
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
