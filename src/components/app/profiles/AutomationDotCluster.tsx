import type { AutomationHealthBuckets } from "@/lib/queries/workspace-dashboard";

interface AutomationDotClusterProps {
  buckets: AutomationHealthBuckets;
  fallbackTotal?: number;
  max?: number;
}

const DOT_BASE = "inline-block h-1.5 w-1.5 rounded-full";

/**
 * Up to N dots colored by per-automation health, then `+M` for overflow.
 * Order: red → amber → green so failures land at the eye-line.
 * If `total` is 0, renders an empty placeholder.
 */
export function AutomationDotCluster({
  buckets,
  fallbackTotal = 0,
  max = 12,
}: AutomationDotClusterProps) {
  const total = buckets.total > 0 ? buckets.total : fallbackTotal;
  if (total === 0) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }

  if (buckets.total === 0 && fallbackTotal > 0) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5">
          {Array.from({ length: Math.min(fallbackTotal, max) }).map((_, i) => (
            <span
              key={i}
              className={`${DOT_BASE} bg-muted-foreground/30`}
              aria-hidden
            />
          ))}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {fallbackTotal}
        </span>
      </span>
    );
  }

  const order: Array<{ key: keyof AutomationHealthBuckets; cls: string }> = [
    { key: "red", cls: "bg-red-500" },
    { key: "amber", cls: "bg-yellow-500" },
    { key: "green", cls: "bg-emerald-500" },
  ];

  const dots: string[] = [];
  for (const { key, cls } of order) {
    const n = buckets[key] as number;
    for (let i = 0; i < n && dots.length < max; i++) dots.push(cls);
  }
  const overflow = Math.max(0, total - dots.length);

  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`${total} automations: ${buckets.green} healthy, ${buckets.amber} warning, ${buckets.red} broken`}
    >
      <span className="inline-flex items-center gap-0.5">
        {dots.map((cls, i) => (
          <span key={i} className={`${DOT_BASE} ${cls}`} aria-hidden />
        ))}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {total}
        {overflow > 0 && <span className="ml-0.5">+{overflow}</span>}
      </span>
    </span>
  );
}
