"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BellOff, Search } from "lucide-react";
import type {
  WorkspaceProfileTriageRow,
  SyncFreshness,
} from "@/lib/queries/workspace-dashboard";
import { getPlatformLabel } from "@/lib/types";
import { healthSeverity, healthSeverityClasses } from "@/lib/dashboard/derivations";
import { PlatformIcon } from "./PlatformIcon";
import { HealthCell } from "./HealthCell";
import { AutomationDotCluster } from "./AutomationDotCluster";
import { SeverityCounts } from "./SeverityCounts";
import { FreshnessCell } from "./FreshnessCell";
import { RowActions } from "./RowActions";
import { BulkActionBar } from "./BulkActionBar";
import { FilterChips, type ChipKey } from "./FilterChips";
import { KeyboardHintsFooter } from "./KeyboardHintsFooter";

type SortKey = "name" | "health" | "automations" | "issues" | "lastSync";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface TriageTableProps {
  workspaceSlug: string;
  rows: WorkspaceProfileTriageRow[];
}

const FRESHNESS_RANK: Record<SyncFreshness, number> = {
  fresh: 4,
  recent: 3,
  stale: 2,
  never: 1,
};

const DENSITY_KEY = "runmend.profiles.density";

export function TriageTable({ workspaceSlug, rows }: TriageTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [activeChips, setActiveChips] = useState<Set<ChipKey>>(new Set());
  const [sorts, setSorts] = useState<SortState[]>([
    { key: "health", dir: "asc" },
  ]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load persisted density
  useEffect(() => {
    const saved = localStorage.getItem(DENSITY_KEY);
    if (saved === "compact" || saved === "comfortable") setDensity(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  const now = Date.now();

  // Compute chip counts from the full unfiltered set
  const chipCounts = useMemo(() => {
    let needs = 0,
      crit = 0,
      stale = 0,
      snoozed = 0,
      healthy = 0;
    for (const r of rows) {
      const isSnoozed = r.snoozedUntil
        ? new Date(r.snoozedUntil).getTime() > now
        : false;
      if (isSnoozed) snoozed += 1;
      if (r.criticalIssueCount > 0) crit += 1;
      if (r.freshness === "stale" || r.freshness === "never") stale += 1;
      if (r.openIssueCount > 0 || r.healthScore < 70) needs += 1;
      if (r.healthScore >= 90 && r.openIssueCount === 0) healthy += 1;
    }
    return { needs, crit, stale, snoozed, healthy };
  }, [rows, now]);

  // Apply search + chip filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const isSnoozed = r.snoozedUntil
        ? new Date(r.snoozedUntil).getTime() > now
        : false;
      if (q) {
        const hay = `${r.name} ${r.industry ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeChips.size > 0) {
        if (
          activeChips.has("needs_attention") &&
          !(r.openIssueCount > 0 || r.healthScore < 70)
        )
          return false;
        if (activeChips.has("critical") && r.criticalIssueCount === 0)
          return false;
        if (
          activeChips.has("stale") &&
          !(r.freshness === "stale" || r.freshness === "never")
        )
          return false;
        if (activeChips.has("snoozed") && !isSnoozed) return false;
        if (
          activeChips.has("healthy") &&
          !(r.healthScore >= 90 && r.openIssueCount === 0)
        )
          return false;
      }
      return true;
    });
  }, [rows, search, activeChips, now]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      for (const s of sorts) {
        const v = compare(a, b, s.key);
        if (v !== 0) return s.dir === "asc" ? v : -v;
      }
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [filtered, sorts]);

  function toggleSort(key: SortKey, additive: boolean) {
    setSorts((curr) => {
      const idx = curr.findIndex((s) => s.key === key);
      if (!additive) {
        if (idx === -1) return [{ key, dir: defaultDir(key) }];
        const flipped = curr[idx].dir === "asc" ? "desc" : "asc";
        return [{ key, dir: flipped }];
      }
      if (idx === -1) return [...curr, { key, dir: defaultDir(key) }];
      const next = [...curr];
      next[idx] = {
        key,
        dir: next[idx].dir === "asc" ? "desc" : "asc",
      };
      return next;
    });
  }

  function toggleChip(k: ChipKey) {
    setActiveChips((curr) => {
      const next = new Set(curr);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const allVisibleSelected =
    sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  function toggleSelectAll() {
    setSelected((curr) => {
      if (allVisibleSelected) {
        const next = new Set(curr);
        for (const r of sorted) next.delete(r.id);
        return next;
      }
      const next = new Set(curr);
      for (const r of sorted) next.add(r.id);
      return next;
    });
  }

  function handleResult(msg: string, ok: boolean) {
    setToast({ msg, ok });
    startTransition(() => router.refresh());
    window.setTimeout(() => setToast(null), 3500);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target?.isContentEditable ?? false);

      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (inField) return;
      if (e.key === "Escape") {
        if (selected.size > 0) setSelected(new Set());
        else if (activeChips.size > 0) setActiveChips(new Set());
        return;
      }
      if (sorted.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(sorted.length - 1, Math.max(0, i + 1)));
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(0, i - 1));
        return;
      }
      if (focusedIdx < 0 || focusedIdx >= sorted.length) return;
      const row = sorted[focusedIdx];
      if (e.key === "x") {
        e.preventDefault();
        toggleSelect(row.id);
        return;
      }
      if (e.key === "o" && row.platformUrl) {
        e.preventDefault();
        window.open(row.platformUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        // Defer to row's RowActions via a synthetic dispatch? Simpler: call action.
        // Inline import to avoid circular: dynamically use server action.
        import("@/app/app/[workspaceSlug]/profiles/actions").then((m) =>
          m.syncProfileAction(row.id).then((r) => {
            handleResult(
              r.ok ? `Synced ${row.name}` : (r.error ?? "Sync failed"),
              r.ok,
            );
          }),
        );
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, focusedIdx, selected, activeChips]);

  const rowH = density === "compact" ? "h-12" : "h-16";
  const rowPad = density === "compact" ? "py-2" : "py-3";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search profiles…  /"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Density</span>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setDensity("compact")}
              className={`rounded px-2 py-0.5 transition-colors ${density === "compact" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setDensity("comfortable")}
              className={`rounded px-2 py-0.5 transition-colors ${density === "comfortable" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Comfortable
            </button>
          </div>
        </div>
      </div>

      <FilterChips
        chips={[
          {
            key: "needs_attention",
            label: "Needs attention",
            count: chipCounts.needs,
            activeClass: "",
          },
          {
            key: "critical",
            label: "Criticals",
            count: chipCounts.crit,
            activeClass: "",
          },
          {
            key: "stale",
            label: "Stale sync",
            count: chipCounts.stale,
            activeClass: "",
          },
          {
            key: "snoozed",
            label: "Snoozed",
            count: chipCounts.snoozed,
            activeClass: "",
          },
          {
            key: "healthy",
            label: "Healthy",
            count: chipCounts.healthy,
            activeClass: "",
          },
        ]}
        active={activeChips}
        onToggle={toggleChip}
        onClear={() => setActiveChips(new Set())}
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="w-8 px-2">
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-border"
                />
              </th>
              <Th
                label="Name"
                sortKey="name"
                sorts={sorts}
                onSort={toggleSort}
              />
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Platform
              </th>
              <Th
                label="Health"
                sortKey="health"
                sorts={sorts}
                onSort={toggleSort}
              />
              <Th
                label="Automations"
                sortKey="automations"
                sorts={sorts}
                onSort={toggleSort}
              />
              <Th
                label="Issues"
                sortKey="issues"
                sorts={sorts}
                onSort={toggleSort}
              />
              <Th
                label="Last sync"
                sortKey="lastSync"
                sorts={sorts}
                onSort={toggleSort}
              />
              <th className="w-24 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No profiles match these filters.
                </td>
              </tr>
            ) : (
              sorted.map((r, idx) => {
                const sev = healthSeverity(r.healthScore);
                const sevCls = healthSeverityClasses(sev);
                const isSelected = selected.has(r.id);
                const isFocused = idx === focusedIdx;
                const isSnoozed =
                  r.snoozedUntil &&
                  new Date(r.snoozedUntil).getTime() > now;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setFocusedIdx(idx)}
                    className={`group relative border-b border-border last:border-0 transition-colors ${rowH} ${
                      isFocused ? "bg-muted/30" : "hover:bg-muted/20"
                    } ${isSnoozed ? "opacity-60" : ""}`}
                  >
                    <td className={`relative ${rowPad} pl-2 pr-2`}>
                      <span
                        className={`absolute inset-y-0 left-0 w-[2px] ${sevCls.bg}`}
                        aria-hidden
                      />
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative ml-1 h-4 w-4 cursor-pointer rounded border-border transition-opacity ${
                          isSelected || selected.size > 0
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      />
                    </td>
                    <td className={`${rowPad} pr-3`}>
                      <Link
                        href={`/app/${workspaceSlug}/profiles/${r.id}`}
                        className="block font-medium text-foreground hover:underline"
                      >
                        {r.name}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {isSnoozed && (
                          <span className="inline-flex items-center gap-0.5 text-sky-400">
                            <BellOff className="h-3 w-3" /> snoozed
                          </span>
                        )}
                        {r.industry && <span>{r.industry}</span>}
                        {r.industry && r.automationCount > 0 && (
                          <span aria-hidden>·</span>
                        )}
                        {r.automationCount > 0 && (
                          <span>
                            {r.automationCount} automation
                            {r.automationCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${rowPad} pr-3`}>
                      <span className="inline-flex items-center gap-2">
                        <PlatformIcon platform={r.platform} size={16} />
                        <span className="text-xs text-muted-foreground">
                          {getPlatformLabel(r.platform)}
                        </span>
                      </span>
                    </td>
                    <td className={`${rowPad} pr-3`}>
                      <HealthCell
                        score={r.healthScore}
                        sparkline={r.sparkline}
                        delta={r.sparklineDelta}
                      />
                    </td>
                    <td className={`${rowPad} pr-3`}>
                      <AutomationDotCluster
                        buckets={r.automationHealth}
                        fallbackTotal={r.automationCount}
                      />
                    </td>
                    <td className={`${rowPad} pr-3`}>
                      <SeverityCounts counts={r.severityCounts} />
                    </td>
                    <td className={`${rowPad} pr-3`}>
                      <FreshnessCell
                        freshness={r.freshness}
                        lastSyncedAt={r.lastSyncedAt}
                      />
                    </td>
                    <td className={`${rowPad} pr-2 text-right`}>
                      <RowActions
                        profileId={r.id}
                        profileName={r.name}
                        platformUrl={r.platformUrl}
                        isSnoozed={!!isSnoozed}
                        onActionResult={handleResult}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <KeyboardHintsFooter
        visibleCount={sorted.length}
        totalCount={rows.length}
      />

      <BulkActionBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        onActionStart={() => {}}
        onActionResult={handleResult}
      />

      {toast && (
        <div
          className={`fixed right-6 top-6 z-40 rounded-md border px-3 py-2 text-sm shadow-lg ${
            toast.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
          role="status"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

interface ThProps {
  label: string;
  sortKey: SortKey;
  sorts: SortState[];
  onSort: (key: SortKey, additive: boolean) => void;
}

function Th({ label, sortKey, sorts, onSort }: ThProps) {
  const idx = sorts.findIndex((s) => s.key === sortKey);
  const active = idx !== -1;
  const dir = active ? sorts[idx].dir : null;
  return (
    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <button
        type="button"
        onClick={(e) => onSort(sortKey, e.shiftKey)}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        {label}
        {active && dir === "asc" && <ArrowUp className="h-3 w-3" />}
        {active && dir === "desc" && <ArrowDown className="h-3 w-3" />}
        {sorts.length > 1 && active && (
          <span className="text-[10px] tabular-nums opacity-60">
            {idx + 1}
          </span>
        )}
      </button>
    </th>
  );
}

function defaultDir(key: SortKey): SortDir {
  // Health & last-sync default to worst-first; counts/name default ascending.
  if (key === "health") return "asc";
  if (key === "lastSync") return "asc";
  if (key === "issues" || key === "automations") return "desc";
  return "asc";
}

function compare(
  a: WorkspaceProfileTriageRow,
  b: WorkspaceProfileTriageRow,
  key: SortKey,
): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "health":
      return a.healthScore - b.healthScore;
    case "automations":
      return (a.automationHealth.total || a.automationCount) -
        (b.automationHealth.total || b.automationCount);
    case "issues": {
      // critical first, then warning, then info
      const ac = a.severityCounts;
      const bc = b.severityCounts;
      if (ac.critical !== bc.critical) return ac.critical - bc.critical;
      if (ac.warning !== bc.warning) return ac.warning - bc.warning;
      return ac.info - bc.info;
    }
    case "lastSync":
      return FRESHNESS_RANK[a.freshness] - FRESHNESS_RANK[b.freshness];
  }
}
