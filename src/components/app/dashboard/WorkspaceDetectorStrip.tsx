import type { DetectorRollupEntry } from "@/lib/dashboard/derivations";

interface WorkspaceDetectorStripProps {
  rollup: DetectorRollupEntry[];
}

export function WorkspaceDetectorStrip({ rollup }: WorkspaceDetectorStripProps) {
  const totalFiring = rollup.reduce((sum, r) => sum + r.count, 0);

  return (
    <section className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Detectors
          </span>
          <span className="text-xs text-muted-foreground">
            {totalFiring === 0
              ? "All clear"
              : `${totalFiring} issue${totalFiring === 1 ? "" : "s"} across ${new Set(rollup.filter((r) => r.affectedProfileCount > 0).flatMap((r) => [r.type])).size} detector${rollup.filter((r) => r.affectedProfileCount > 0).length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {rollup.map((entry) => (
            <DetectorPill key={entry.type} entry={entry} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DetectorPill({ entry }: { entry: DetectorRollupEntry }) {
  const classes =
    entry.state === "fail"
      ? "border-red-500/60 bg-red-500/10 text-red-400"
      : entry.state === "warn"
        ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
        : "border-border bg-muted/20 text-muted-foreground";

  const dot =
    entry.state === "fail"
      ? "bg-red-500"
      : entry.state === "warn"
        ? "bg-yellow-500"
        : "bg-emerald-500/70";

  const tooltip =
    entry.count > 0
      ? `${entry.count} issue${entry.count === 1 ? "" : "s"} · ${entry.affectedProfileCount} profile${entry.affectedProfileCount === 1 ? "" : "s"}\n${entry.description}`
      : `Clear — ${entry.description}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
      title={tooltip}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span>{entry.shortLabel}</span>
      {entry.count > 0 && (
        <span className="tabular-nums opacity-90">· {entry.count}</span>
      )}
    </span>
  );
}
