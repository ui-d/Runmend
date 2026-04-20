"use client";

import { DETECTORS } from "@/lib/detectors";
import type { AutomationIssue } from "@/lib/types";
import {
  computeDetectorStates,
  type DetectorChipState,
} from "@/lib/dashboard/derivations";

interface DetectorStripProps {
  issues: AutomationIssue[];
}

export function DetectorStrip({ issues }: DetectorStripProps) {
  const stateByType = computeDetectorStates(issues);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Detectors
      </span>
      {DETECTORS.map((det) => {
        const entry = stateByType.get(det.type) ?? { state: "pass", count: 0 };
        return (
          <DetectorChip
            key={det.type}
            label={det.shortLabel}
            state={entry.state}
            count={entry.count}
          />
        );
      })}
    </div>
  );
}

function DetectorChip({
  label,
  state,
  count,
}: {
  label: string;
  state: DetectorChipState;
  count: number;
}) {
  const classes =
    state === "fail"
      ? "border-red-500/60 bg-red-500/10 text-red-400"
      : state === "warn"
        ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
        : "border-border bg-muted/30 text-muted-foreground";

  const dot =
    state === "fail"
      ? "bg-red-500"
      : state === "warn"
        ? "bg-yellow-500"
        : "bg-emerald-500/70";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span>{label}</span>
      {count > 0 && (
        <span className="tabular-nums opacity-90">· {count}</span>
      )}
    </span>
  );
}
