"use client";

import { X } from "lucide-react";

export type ChipKey =
  | "needs_attention"
  | "critical"
  | "stale"
  | "snoozed"
  | "healthy";

interface ChipDef {
  key: ChipKey;
  label: string;
  count: number;
  activeClass: string;
}

interface FilterChipsProps {
  chips: ChipDef[];
  active: Set<ChipKey>;
  onToggle: (key: ChipKey) => void;
  onClear: () => void;
}

const ACTIVE_BG: Record<ChipKey, string> = {
  needs_attention: "bg-yellow-500/10 border-yellow-500/40 text-yellow-400",
  critical: "bg-red-500/10 border-red-500/40 text-red-400",
  stale: "bg-orange-500/10 border-orange-500/40 text-orange-300",
  snoozed: "bg-sky-500/10 border-sky-500/40 text-sky-300",
  healthy: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
};

const DOT: Record<ChipKey, string> = {
  needs_attention: "bg-yellow-500",
  critical: "bg-red-500",
  stale: "bg-orange-500",
  snoozed: "bg-sky-500",
  healthy: "bg-emerald-500",
};

/**
 * Chip row above the table. Each chip is a toggleable filter; combinations
 * AND together. Chips with zero count are dimmed but still clickable so the
 * user sees the full filter palette consistently.
 */
export function FilterChips({
  chips,
  active,
  onToggle,
  onClear,
}: FilterChipsProps) {
  const anyActive = active.size > 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => {
        const isActive = active.has(c.key);
        const empty = c.count === 0;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onToggle(c.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? ACTIVE_BG[c.key]
                : empty
                  ? "border-border/60 bg-background text-muted-foreground/60"
                  : "border-border bg-background text-foreground hover:bg-muted/40"
            }`}
            aria-pressed={isActive}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[c.key]} ${
                empty && !isActive ? "opacity-40" : ""
              }`}
              aria-hidden
            />
            {c.label}
            <span className="tabular-nums opacity-70">·</span>
            <span className="tabular-nums">{c.count}</span>
            {isActive && <X className="ml-0.5 h-3 w-3" aria-hidden />}
          </button>
        );
      })}
      {anyActive && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
