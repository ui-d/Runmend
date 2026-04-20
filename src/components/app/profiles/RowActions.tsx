"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  BellOff,
  Bell,
  Trash2,
} from "lucide-react";
import {
  syncProfileAction,
  deleteProfilesAction,
  snoozeProfileAction,
  type SnoozeDuration,
} from "@/app/app/[workspaceSlug]/profiles/actions";

interface RowActionsProps {
  profileId: string;
  profileName: string;
  platformUrl: string | null;
  isSnoozed: boolean;
  onActionStart?: () => void;
  onActionResult?: (msg: string, ok: boolean) => void;
}

/**
 * Hover-revealed quick actions plus an overflow menu. Uses a tiny custom
 * popover (no shadcn DropdownMenu installed). Escape and outside-click
 * close it; clicking an action closes immediately and dispatches.
 */
export function RowActions({
  profileId,
  profileName,
  platformUrl,
  isSnoozed,
  onActionStart,
  onActionResult,
}: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSnoozeOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSnoozeOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function runSync() {
    setOpen(false);
    onActionStart?.();
    const r = await syncProfileAction(profileId);
    onActionResult?.(
      r.ok ? `Synced ${profileName}` : (r.error ?? "Sync failed"),
      r.ok,
    );
  }

  async function runDelete() {
    setOpen(false);
    if (!confirm(`Delete profile "${profileName}"? This cannot be undone.`))
      return;
    onActionStart?.();
    const r = await deleteProfilesAction([profileId]);
    onActionResult?.(
      r.ok ? `Deleted ${profileName}` : (r.error ?? "Delete failed"),
      r.ok,
    );
  }

  async function runSnooze(duration: SnoozeDuration) {
    setOpen(false);
    setSnoozeOpen(false);
    onActionStart?.();
    const r = await snoozeProfileAction(profileId, duration);
    const verb = duration === "clear" ? "Unsnoozed" : "Snoozed";
    onActionResult?.(
      r.ok ? `${verb} ${profileName}` : (r.error ?? "Snooze failed"),
      r.ok,
    );
  }

  return (
    <div
      className="relative inline-flex items-center gap-1"
      ref={wrapperRef}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hover-revealed quick action: sync */}
      <button
        type="button"
        onClick={runSync}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        title="Sync now (s)"
        aria-label="Sync now"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      {platformUrl && (
        <a
          href={platformUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          title="Open in source (o)"
          aria-label="Open in source"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="More"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-popover py-1 text-sm shadow-md"
        >
          {!snoozeOpen ? (
            <>
              <MenuItem icon={RefreshCw} label="Sync now" onClick={runSync} />
              {platformUrl && (
                <MenuItem
                  icon={ExternalLink}
                  label="Open in source"
                  onClick={() => {
                    window.open(platformUrl, "_blank", "noopener,noreferrer");
                    setOpen(false);
                  }}
                />
              )}
              {isSnoozed ? (
                <MenuItem
                  icon={Bell}
                  label="Unsnooze"
                  onClick={() => runSnooze("clear")}
                />
              ) : (
                <MenuItem
                  icon={BellOff}
                  label="Snooze…"
                  onClick={() => setSnoozeOpen(true)}
                />
              )}
              <div className="my-1 h-px bg-border" />
              <MenuItem
                icon={Trash2}
                label="Delete"
                danger
                onClick={runDelete}
              />
            </>
          ) : (
            <>
              <MenuItem label="1 day" onClick={() => runSnooze("1d")} />
              <MenuItem label="7 days" onClick={() => runSnooze("7d")} />
              <MenuItem
                label="Until I act"
                onClick={() => runSnooze("indefinite")}
              />
              <div className="my-1 h-px bg-border" />
              <MenuItem label="Cancel" onClick={() => setSnoozeOpen(false)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

function MenuItem({ label, onClick, icon: Icon, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted ${
        danger ? "text-red-500" : "text-foreground"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
