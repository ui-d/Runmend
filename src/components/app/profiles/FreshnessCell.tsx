import type { SyncFreshness } from "@/lib/queries/workspace-dashboard";
import { formatRelative } from "@/lib/time";

interface FreshnessCellProps {
  freshness: SyncFreshness;
  lastSyncedAt: string | null;
}

const DOT: Record<SyncFreshness, string> = {
  fresh: "bg-emerald-500",
  recent: "bg-yellow-500",
  stale: "bg-red-500",
  never: "bg-muted-foreground/40",
};

const LABEL_TEXT: Record<SyncFreshness, string> = {
  fresh: "text-emerald-500",
  recent: "text-foreground",
  stale: "text-red-500",
  never: "text-muted-foreground",
};

/**
 * Sync staleness signal: a small colored dot + relative-time text. Tightly
 * coupled to deriveFreshness() thresholds in workspace-dashboard.ts so the
 * dot color always matches the text recency.
 */
export function FreshnessCell({ freshness, lastSyncedAt }: FreshnessCellProps) {
  const text =
    freshness === "never" || !lastSyncedAt
      ? "never"
      : formatRelative(lastSyncedAt);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[freshness]}`}
        aria-hidden
      />
      <span className={`text-xs tabular-nums ${LABEL_TEXT[freshness]}`}>
        {text}
      </span>
    </span>
  );
}
