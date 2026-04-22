"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestConnectorAction } from "@/app/app/[workspaceSlug]/connections/actions";

interface RequestConnectorInputProps {
  workspaceId: string;
}

/**
 * Free-text catalog request. Submitting captures the requested platform
 * slug and an optional note into connection_requests, giving us a
 * pre-launch roadmap signal per workspace.
 */
export function RequestConnectorInput({ workspaceId }: RequestConnectorInputProps) {
  const [value, setValue] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    const slug = value.trim();
    if (slug.length === 0) return;
    startTransition(async () => {
      const result = await requestConnectorAction(workspaceId, {
        platformSlug: slug,
      });
      if (result.ok) {
        setValue("");
        setSuccess(true);
        toast.success(`Request for ${slug} added to roadmap`);
      } else {
        const message = result.error ?? "Failed to submit request";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/20 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          Don&apos;t see your platform?
        </p>
        <p className="text-xs text-muted-foreground">
          Tell us what you need. Every request routes straight to the roadmap.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (success) setSuccess(false);
          }}
          placeholder="e.g. Activepieces, Retool workflows, custom webhook…"
          maxLength={120}
          disabled={pending}
          aria-label="Platform to request"
        />
        <Button type="submit" disabled={pending || value.trim().length === 0}>
          <Send className="mr-1 h-3.5 w-3.5" />
          Request
        </Button>
      </form>
      {success && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Thanks — we&apos;ll notify you when it ships.
        </p>
      )}
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
