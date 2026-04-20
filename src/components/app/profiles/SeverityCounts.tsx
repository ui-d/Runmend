import type { SeverityCounts as Counts } from "@/lib/queries/workspace-dashboard";

interface SeverityCountsProps {
  counts: Counts;
}

/**
 * Three numbers `crit · warn · info`, color-coded. Zeros are dimmed so the
 * eye lands on the worst-present severity first.
 */
export function SeverityCounts({ counts }: SeverityCountsProps) {
  const total = counts.critical + counts.warning + counts.info;
  if (total === 0) {
    return <span className="text-xs text-muted-foreground/60">0</span>;
  }
  return (
    <span className="inline-flex items-baseline gap-1 font-medium tabular-nums">
      <Cell value={counts.critical} active="text-red-500" />
      <span className="text-muted-foreground/40">·</span>
      <Cell value={counts.warning} active="text-yellow-500" />
      <span className="text-muted-foreground/40">·</span>
      <Cell value={counts.info} active="text-sky-400" />
    </span>
  );
}

function Cell({ value, active }: { value: number; active: string }) {
  if (value === 0) {
    return <span className="text-xs text-muted-foreground/40">0</span>;
  }
  return <span className={`text-sm ${active}`}>{value}</span>;
}
