"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConnectMakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  defaultDisplayName?: string;
  allowRenameAccount?: boolean;
}

export function ConnectMakeDialog({
  open,
  onOpenChange,
  workspaceId,
  defaultDisplayName = "Primary",
  allowRenameAccount = false,
}: ConnectMakeDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [zone, setZone] = useState("us1");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setDisplayName(defaultDisplayName);
  }, [open, defaultDisplayName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          platform: "make",
          apiKey,
          zone,
          displayName: displayName.trim() || "Primary",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      const label = displayName.trim() || "Primary";
      toast.success(`Make.com · ${label} connected`);
      onOpenChange(false);
      setApiKey("");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Make.com</DialogTitle>
          <DialogDescription>
            Enter your Make.com API token. You can find it in Make.com
            &gt; Profile &gt; API. Use an organization-level token to
            monitor all scenarios across teams.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {allowRenameAccount && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Account label</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g. Client A, Agency sandbox"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Shown on the connections page so you can tell multiple accounts
                apart.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Token</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Paste your Make.com API token"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone">Region</Label>
            <select
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="us1">US (us1.make.com)</option>
              <option value="eu1">EU (eu1.make.com)</option>
              <option value="eu2">EU 2 (eu2.make.com)</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !apiKey}>
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
