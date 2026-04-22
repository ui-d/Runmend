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

interface ConnectN8nDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  defaultDisplayName?: string;
  allowRenameAccount?: boolean;
}

export function ConnectN8nDialog({
  open,
  onOpenChange,
  workspaceId,
  defaultDisplayName = "Primary",
  allowRenameAccount = false,
}: ConnectN8nDialogProps) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
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
          platform: "n8n",
          apiKey,
          instanceUrl,
          displayName: displayName.trim() || "Primary",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      const label = displayName.trim() || "Primary";
      toast.success(`n8n · ${label} connected`);
      onOpenChange(false);
      setApiKey("");
      setInstanceUrl("");
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
          <DialogTitle>Connect n8n</DialogTitle>
          <DialogDescription>
            Enter your client&apos;s n8n instance URL and API key. For
            self-hosted instances, ensure the URL is publicly accessible
            or reachable from our servers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {allowRenameAccount && (
            <div className="space-y-2">
              <Label htmlFor="n8nDisplayName">Account label</Label>
              <Input
                id="n8nDisplayName"
                type="text"
                placeholder="e.g. Client A, Staging"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Shown on the connections page so you can tell multiple instances
                apart.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="instanceUrl">Instance URL</Label>
            <Input
              id="instanceUrl"
              type="url"
              placeholder="https://n8n.yourdomain.com"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="n8nApiKey">API Key</Label>
            <Input
              id="n8nApiKey"
              type="password"
              placeholder="Your n8n API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
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
            <Button type="submit" disabled={loading || !apiKey || !instanceUrl}>
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
