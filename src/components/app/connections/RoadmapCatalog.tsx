"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  AVAILABLE_CONNECTORS,
  COMING_SOON_CONNECTORS,
} from "@/lib/connections/catalog";
import { AvailableConnectorTile } from "./AvailableConnectorTile";
import { ComingSoonTile } from "./ComingSoonTile";
import { RequestConnectorInput } from "./RequestConnectorInput";
import { toggleInterestAction } from "@/app/app/[workspaceSlug]/connections/actions";

interface RoadmapCatalogProps {
  workspaceId: string;
  workspaceSlug: string;
  voteCounts: Record<string, number>;
  userVotedSlugs: string[];
}

export function RoadmapCatalog({
  workspaceId,
  workspaceSlug,
  voteCounts,
  userVotedSlugs,
}: RoadmapCatalogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localVoteCounts, setLocalVoteCounts] = useState(voteCounts);
  const [localVoted, setLocalVoted] = useState(new Set(userVotedSlugs));
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const comingSoonAvailable = useMemo(
    () => AVAILABLE_CONNECTORS.filter((entry) => entry.comingSoon),
    [],
  );

  const platformLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of AVAILABLE_CONNECTORS) map.set(entry.slug, entry.label);
    for (const entry of COMING_SOON_CONNECTORS) map.set(entry.slug, entry.label);
    return map;
  }, []);

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
      const label = platformLabelBySlug.get(slug) ?? slug;
      if (!result.ok) {
        setLocalVoted(localVoted);
        setLocalVoteCounts(voteCounts);
        toast.error(result.error ?? "Could not record your vote");
      } else {
        if (typeof result.count === "number") {
          setLocalVoteCounts((prev) => ({ ...prev, [slug]: result.count ?? 0 }));
        }
        toast.success(
          result.voted
            ? `We'll notify you when ${label} ships`
            : `Removed your vote for ${label}`,
        );
      }
      setPendingSlug(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href={`/app/${workspaceSlug}/connections`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Connections
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Integration roadmap</h1>
        <p className="text-sm text-muted-foreground">
          Vote on the platforms you want next. We ship what the most people
          vote for.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          In the works
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {comingSoonAvailable.map((entry) => (
            <AvailableConnectorTile
              key={entry.slug}
              entry={entry}
              onConnect={() => undefined}
              onNotifyMe={handleVoteToggle}
              voteCount={localVoteCounts[entry.slug] ?? 0}
              hasVoted={localVoted.has(entry.slug)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          On the wishlist
        </h2>
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
    </div>
  );
}
