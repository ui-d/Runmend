"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspaceNameAction } from "@/app/app/[workspaceSlug]/settings/actions";

interface WorkspaceFormProps {
  workspaceId: string;
  workspaceSlug: string;
  initialName: string;
  canEdit: boolean;
  ownerEmail: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkspaceForm({
  workspaceId,
  workspaceSlug,
  initialName,
  canEdit,
  ownerEmail,
  createdAt,
}: WorkspaceFormProps) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const isDirty = name.trim() !== initialName && name.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;

    startTransition(async () => {
      const result = await updateWorkspaceNameAction({
        workspaceId,
        name: name.trim(),
        workspaceSlug,
      });
      if (result.ok) {
        setStatus("saved");
        setErrorMsg(null);
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  function handleCopySlug() {
    navigator.clipboard.writeText(workspaceSlug);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <div className="flex gap-2">
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || pending}
              maxLength={60}
              className="max-w-sm"
            />
            <Button
              type="submit"
              disabled={!canEdit || !isDirty || pending}
              size="sm"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : status === "saved" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              Only workspace owners and admins can change the name.
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workspace-slug">URL slug</Label>
          <div className="flex items-center gap-2 max-w-sm">
            <div className="flex h-8 flex-1 items-center gap-1 rounded-lg border border-input bg-muted/30 px-2.5 font-mono text-sm text-muted-foreground">
              <span className="text-muted-foreground/60">runmend.app/app/</span>
              <span className="text-foreground">{workspaceSlug}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySlug}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Slugs are part of your URLs and can&apos;t be changed. Contact support if
            you need to migrate.
          </p>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Owner
          </p>
          <p className="mt-1 text-sm">{ownerEmail}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Created
          </p>
          <p className="mt-1 text-sm">{formatDate(createdAt)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Region
          </p>
          <p className="mt-1 text-sm text-muted-foreground">US East (Supabase)</p>
        </div>
      </div>
    </div>
  );
}
