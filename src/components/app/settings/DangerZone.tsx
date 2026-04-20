"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DangerZoneProps {
  workspaceSlug: string;
  canDelete: boolean;
}

export function DangerZone({ workspaceSlug, canDelete }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed === workspaceSlug;

  return (
    <>
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-red-500/10 p-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-300">Delete workspace</p>
              <p className="text-xs text-muted-foreground">
                This permanently removes all profiles, connections, issues, and
                diagnostic history for this workspace. Cannot be undone.
              </p>
              {!canDelete && (
                <p className="text-xs text-red-400/80">
                  Only the workspace owner can trigger deletion.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => setOpen(true)}
            className={cn(
              "h-8 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors",
              canDelete
                ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                : "border-border/60 bg-muted/30 text-muted-foreground cursor-not-allowed"
            )}
          >
            Delete workspace…
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border/60 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-red-500/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Confirm deletion</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Type the workspace slug to continue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-sm">
                  Type{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {workspaceSlug}
                  </code>{" "}
                  to confirm.
                </p>
              </div>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={workspaceSlug}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-300/90">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Workspace deletion is disabled in the product surface to
                  prevent accidental data loss. To delete a workspace today,
                  email{" "}
                  <a
                    href="mailto:support@runmend.app"
                    className="underline hover:text-yellow-200"
                  >
                    support@runmend.app
                  </a>{" "}
                  from the owner address — we&apos;ll handle it within one
                  business day.
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setTyped("");
                  }}
                  className="h-8 rounded-lg border border-border/60 bg-transparent px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <a
                  href="mailto:support@runmend.app?subject=Workspace%20deletion%20request"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium",
                    matches
                      ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      : "border-border/60 bg-muted/30 text-muted-foreground pointer-events-none"
                  )}
                  aria-disabled={!matches}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Email support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
