"use client";

import { RefreshCw, Trash2, X } from "lucide-react";
import {
  bulkSyncProfilesAction,
  deleteProfilesAction,
} from "@/app/app/[workspaceSlug]/profiles/actions";

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
  onActionStart: () => void;
  onActionResult: (msg: string, ok: boolean) => void;
}

/**
 * Slide-in action bar that appears when one or more rows are selected.
 * Bulk sync runs syncs in parallel and reports the aggregate; bulk delete
 * confirms once for the whole batch.
 */
export function BulkActionBar({
  selectedIds,
  onClear,
  onActionStart,
  onActionResult,
}: BulkActionBarProps) {
  if (selectedIds.length === 0) return null;

  async function runBulkSync() {
    onActionStart();
    const r = await bulkSyncProfilesAction(selectedIds);
    onActionResult(
      r.failed === 0
        ? `Synced ${r.succeeded} profile${r.succeeded === 1 ? "" : "s"}`
        : `${r.succeeded} synced, ${r.failed} failed`,
      r.failed === 0,
    );
  }

  async function runBulkDelete() {
    if (
      !confirm(
        `Delete ${selectedIds.length} profile${
          selectedIds.length === 1 ? "" : "s"
        }? This cannot be undone.`,
      )
    )
      return;
    onActionStart();
    const r = await deleteProfilesAction(selectedIds);
    onActionResult(
      r.ok
        ? `Deleted ${selectedIds.length} profile${selectedIds.length === 1 ? "" : "s"}`
        : (r.error ?? "Delete failed"),
      r.ok,
    );
    if (r.ok) onClear();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-popover/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
        <span className="font-medium tabular-nums">
          {selectedIds.length} selected
        </span>
        <span className="h-4 w-px bg-border" />
        <button
          type="button"
          onClick={runBulkSync}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground transition-colors hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync
        </button>
        <button
          type="button"
          onClick={runBulkDelete}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-red-500 transition-colors hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
        <span className="h-4 w-px bg-border" />
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Clear selection (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
